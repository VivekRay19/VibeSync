import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { CreateRoomSchema } from '@/lib/validations/room-schema';
import { createRoom } from '@/lib/neon/db';
import { getAuthenticatedUser, setSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = CreateRoomSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid room creation data', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, displayName } = validation.data;

    // Use existing verified user identity or issue a new secure UUID
    const existingSession = getAuthenticatedUser();
    const userId = existingSession?.userId || crypto.randomUUID();

    const { room, playbackState } = await createRoom(name, userId, displayName);

    const response = NextResponse.json(
      {
        room,
        playbackState,
        user: { userId, displayName },
      },
      { status: 201 }
    );

    // Issue tamper-proof signed session cookie
    const cookie = setSessionCookie(userId, displayName);
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (err) {
    console.error('Room create API error:', err);
    return NextResponse.json(
      { error: 'Failed to create room', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
