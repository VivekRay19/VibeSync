import { NextRequest, NextResponse } from 'next/server';
import { PlaybackCommandSchema } from '@/lib/validations/room-schema';
import { updatePlaybackCommand, getQueue } from '@/lib/neon/db';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { broadcastToRoom } from '@/lib/realtime/broadcast';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = PlaybackCommandSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid playback command', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { roomId, command, positionSeconds, revision, track, queueItemId, commandId, scheduledAt } = validation.data;

    // Derive identity from signed session or fallback to provided identity
    const session = getAuthenticatedUser();
    const userId = session?.userId || body.userId || 'guest_user';
    const displayName = session?.displayName || body.displayName || 'Room Listener';

    // Authoritative update in Neon Postgres
    const updatedState = await updatePlaybackCommand({
      roomId,
      command,
      positionSeconds: positionSeconds || 0,
      revision,
      track,
      queueItemId,
      userId,
      displayName,
      commandId,
      scheduledAt,
    });

    // Real-time broadcast to all connected room listeners
    broadcastToRoom(roomId, 'PLAYBACK_STATE', { state: updatedState, commandId });

    // If skip occurred, queue also mutated, broadcast updated queue
    if (command === 'SKIP_NEXT') {
      const updatedQueue = await getQueue(roomId);
      broadcastToRoom(roomId, 'QUEUE_UPDATE', { queue: updatedQueue });
    }

    return NextResponse.json({ state: updatedState }, { status: 200 });
  } catch (err) {
    console.error('Command API error:', err);
    return NextResponse.json(
      { error: 'Failed to execute command', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
