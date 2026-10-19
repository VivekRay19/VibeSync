import { NextRequest, NextResponse } from 'next/server';
import { JoinRoomSchema } from '@/lib/validations/room-schema';
import { joinRoomAction } from '@/lib/supabase/server';

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
    const userId = body.userId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `user_${Math.random().toString(36).substring(2, 9)}`);

    const result = await joinRoomAction(roomCode, userId, displayName);
    if (result.error || !result.room) {
      return NextResponse.json({ error: result.error || 'Room not found' }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('Room join API error:', err);
    return NextResponse.json(
      { error: 'Failed to join room', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
