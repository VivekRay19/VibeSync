import { NextRequest, NextResponse } from 'next/server';
import { CreateRoomSchema } from '@/lib/validations/room-schema';
import { createRoomAction } from '@/lib/supabase/server';

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
    const userId = body.userId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `user_${Math.random().toString(36).substring(2, 9)}`);

    const result = await createRoomAction(name, userId, displayName);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error('Room create API error:', err);
    return NextResponse.json(
      { error: 'Failed to create room', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
