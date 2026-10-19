import { NextRequest, NextResponse } from 'next/server';
import { ModerationActionSchema } from '@/lib/validations/room-schema';
import { kickMember, closeRoom, getMembers } from '@/lib/neon/db';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { broadcastToRoom } from '@/lib/realtime/broadcast';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = ModerationActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid moderation request', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { roomId, action, targetUserId } = validation.data;
    const session = getAuthenticatedUser();
    const callerId = session?.userId || body.callerId || '';

    if (action === 'KICK_MEMBER' && targetUserId) {
      const result = await kickMember(roomId, callerId, targetUserId);
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to kick member' }, { status: 403 });
      }

      // Broadcast member kicked and updated members list
      const updatedMembers = await getMembers(roomId);
      broadcastToRoom(roomId, 'MEMBER_KICKED', { targetUserId, members: updatedMembers });

      return NextResponse.json({ success: true, message: 'Member removed' }, { status: 200 });
    } else if (action === 'CLOSE_ROOM') {
      const result = await closeRoom(roomId, callerId);
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to close room' }, { status: 403 });
      }

      // Broadcast room closed to terminate listeners' sessions
      broadcastToRoom(roomId, 'ROOM_CLOSED', { roomId });

      return NextResponse.json({ success: true, message: 'Room closed' }, { status: 200 });
    }

    return NextResponse.json({ error: 'Unsupported moderation action' }, { status: 400 });
  } catch (err) {
    console.error('Moderation action failed:', err);
    return NextResponse.json(
      { error: 'Moderation action failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
