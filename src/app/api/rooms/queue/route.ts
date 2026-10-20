import { NextRequest, NextResponse } from 'next/server';
import { QueueActionSchema } from '@/lib/validations/room-schema';
import { getQueue, addQueueItem, removeQueueItem, reorderQueue, moveQueueItem, shuffleQueue } from '@/lib/neon/db';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { broadcastToRoom } from '@/lib/realtime/broadcast';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId parameter' }, { status: 400 });
    }

    const queue = await getQueue(roomId);
    return NextResponse.json({ queue }, { status: 200 });
  } catch (err) {
    console.error('Queue fetch error:', err);
    return NextResponse.json(
      { error: 'Queue fetch failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = QueueActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid queue action payload', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { roomId, action, track, queueItemId, orderedItemIds, direction } = validation.data;
    const session = getAuthenticatedUser();
    const userId = session?.userId || body.userId || 'guest_user';
    const displayName = session?.displayName || body.displayName || 'Room Listener';

    if (action === 'ADD' && track) {
      const item = await addQueueItem(roomId, track, userId, displayName);
      const updatedQueue = await getQueue(roomId);

      // Broadcast new queue to all room members
      broadcastToRoom(roomId, 'QUEUE_UPDATE', { queue: updatedQueue });

      return NextResponse.json({ item, queue: updatedQueue }, { status: 201 });
    } else if (action === 'REMOVE' && queueItemId) {
      await removeQueueItem(roomId, queueItemId);
      const updatedQueue = await getQueue(roomId);

      // Broadcast removed queue to all room members
      broadcastToRoom(roomId, 'QUEUE_UPDATE', { queue: updatedQueue });

      return NextResponse.json({ success: true, removedId: queueItemId, queue: updatedQueue }, { status: 200 });
    } else if (action === 'REORDER' && orderedItemIds && orderedItemIds.length > 0) {
      const updatedQueue = await reorderQueue(roomId, orderedItemIds);
      broadcastToRoom(roomId, 'QUEUE_UPDATE', { queue: updatedQueue });
      return NextResponse.json({ success: true, queue: updatedQueue }, { status: 200 });
    } else if (action === 'MOVE' && queueItemId && direction) {
      const updatedQueue = await moveQueueItem(roomId, queueItemId, direction);
      broadcastToRoom(roomId, 'QUEUE_UPDATE', { queue: updatedQueue });
      return NextResponse.json({ success: true, queue: updatedQueue }, { status: 200 });
    } else if (action === 'SHUFFLE') {
      const updatedQueue = await shuffleQueue(roomId);
      broadcastToRoom(roomId, 'QUEUE_UPDATE', { queue: updatedQueue });
      return NextResponse.json({ success: true, queue: updatedQueue }, { status: 200 });
    }

    return NextResponse.json({ error: 'Unsupported queue action' }, { status: 400 });
  } catch (err) {
    console.error('Queue action failed:', err);
    return NextResponse.json(
      { error: 'Queue action failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
