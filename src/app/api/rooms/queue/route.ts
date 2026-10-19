import { NextRequest, NextResponse } from 'next/server';
import { QueueActionSchema } from '@/lib/validations/room-schema';
import { getServerSupabase } from '@/lib/supabase/server';
import { memoryStore } from '@/lib/supabase/mock-store';
import { QueueItem } from '@/lib/types/music';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      const queue = memoryStore.getQueue(roomId);
      return NextResponse.json({ queue }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('queue_items')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'pending')
      .order('queue_position', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
    }

    const queue: QueueItem[] = (data || []).map((q) => ({
      id: q.id,
      roomId: q.room_id,
      track: q.track_metadata,
      addedByUserId: q.added_by,
      addedByName: q.added_by_name,
      queuePosition: q.queue_position,
      createdAt: q.created_at,
      status: q.status,
    }));

    return NextResponse.json({ queue }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Queue fetch failed' }, { status: 500 });
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

    const { roomId, action, track, queueItemId } = validation.data;
    const userId = body.userId || 'anonymous';
    const displayName = body.displayName || 'Room Listener';

    const supabase = getServerSupabase();

    if (!supabase) {
      if (action === 'ADD' && track) {
        const item = memoryStore.addQueueItem(roomId, track, userId, displayName);
        const queue = memoryStore.getQueue(roomId);
        return NextResponse.json({ item, queue }, { status: 201 });
      } else if (action === 'REMOVE' && queueItemId) {
        const queue = memoryStore.removeQueueItem(roomId, queueItemId);
        return NextResponse.json({ queue }, { status: 200 });
      }
      return NextResponse.json({ queue: memoryStore.getQueue(roomId) }, { status: 200 });
    }

    if (action === 'ADD' && track) {
      // Find current max queue position
      const { count } = await supabase
        .from('queue_items')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .eq('status', 'pending');

      const nextPos = count || 0;

      const { data, error } = await supabase
        .from('queue_items')
        .insert({
          room_id: roomId,
          provider_id: track.provider,
          provider_track_id: track.providerTrackId,
          track_metadata: track,
          added_by: userId,
          added_by_name: displayName,
          queue_position: nextPos,
          status: 'pending',
        })
        .select()
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Failed to add item to queue' }, { status: 500 });
      }

      const item: QueueItem = {
        id: data.id,
        roomId: data.room_id,
        track: data.track_metadata,
        addedByUserId: data.added_by,
        addedByName: data.added_by_name,
        queuePosition: data.queue_position,
        createdAt: data.created_at,
        status: data.status,
      };

      return NextResponse.json({ item }, { status: 201 });
    } else if (action === 'REMOVE' && queueItemId) {
      await supabase.from('queue_items').delete().eq('id', queueItemId).eq('room_id', roomId);
      return NextResponse.json({ success: true, removedId: queueItemId }, { status: 200 });
    }

    return NextResponse.json({ error: 'Unsupported queue action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Queue action failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
