import { NextRequest, NextResponse } from 'next/server';
import { ModerationActionSchema } from '@/lib/validations/room-schema';
import { getServerSupabase } from '@/lib/supabase/server';
import { memoryStore } from '@/lib/supabase/mock-store';

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
    const callerId = body.callerId || '';

    const supabase = getServerSupabase();

    if (!supabase) {
      const room = memoryStore.getRoomById(roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      if (room.ownerId !== callerId) {
        return NextResponse.json({ error: 'Only the room owner can perform moderation actions' }, { status: 403 });
      }

      if (action === 'KICK_MEMBER' && targetUserId) {
        memoryStore.removeMember(roomId, targetUserId);
        return NextResponse.json({ success: true, message: 'Member removed' }, { status: 200 });
      } else if (action === 'CLOSE_ROOM') {
        room.status = 'closed';
        return NextResponse.json({ success: true, message: 'Room closed' }, { status: 200 });
      }

      return NextResponse.json({ error: 'Invalid moderation action' }, { status: 400 });
    }

    // Verify room ownership
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('owner_id')
      .eq('id', roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.owner_id !== callerId) {
      return NextResponse.json({ error: 'Only the room owner can perform moderation actions' }, { status: 403 });
    }

    if (action === 'KICK_MEMBER' && targetUserId) {
      await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', targetUserId);
      return NextResponse.json({ success: true, message: 'Member removed' }, { status: 200 });
    } else if (action === 'CLOSE_ROOM') {
      await supabase
        .from('rooms')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', roomId);
      return NextResponse.json({ success: true, message: 'Room closed' }, { status: 200 });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Moderation action failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
