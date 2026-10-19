import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { JoinRoomSchema } from '@/lib/validations/room-schema';
import { joinRoom } from '@/lib/neon/db';
import { getAuthenticatedUser, setSessionCookie } from '@/lib/auth/session';
import { broadcastToRoom } from '@/lib/realtime/broadcast';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = JoinRoomSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid room join data', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { roomCode, displayName } = validation.data;

    // Use existing verified user identity or issue a new secure UUID
    const existingSession = getAuthenticatedUser();
    const userId = existingSession?.userId || crypto.randomUUID();

    const result = await joinRoom(roomCode, userId, displayName);
    if (result.error || !result.room) {
      return NextResponse.json({ error: result.error || 'Room not found' }, { status: 404 });
    }

    // Broadcast user joined event to active SSE clients
    broadcastToRoom(result.room.id, 'USER_JOINED', {
      userId,
      displayName,
      joinedAt: new Date().toISOString(),
    });

    const response = NextResponse.json(
      {
        room: result.room,
        playbackState: result.playbackState,
        members: result.members,
        queue: result.queue,
        user: { userId, displayName },
      },
      { status: 200 }
    );

    // Issue tamper-proof signed session cookie
    const cookie = setSessionCookie(userId, displayName);
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (err) {
    console.error('Room join API error:', err);
    return NextResponse.json(
      { error: 'Failed to join room', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
