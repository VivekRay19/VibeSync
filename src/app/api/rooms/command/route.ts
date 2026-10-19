import { NextRequest, NextResponse } from 'next/server';
import { PlaybackCommandSchema } from '@/lib/validations/room-schema';
import { getServerSupabase } from '@/lib/supabase/server';
import { memoryStore } from '@/lib/supabase/mock-store';
import { PlaybackState, PlaybackStatus } from '@/lib/types/music';

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

    const { roomId, command, positionSeconds, track, queueItemId } = validation.data;
    const userId = body.userId || 'anonymous';
    const displayName = body.displayName || 'Room Listener';

    const supabase = getServerSupabase();
    const nowIso = new Date().toISOString();

    if (!supabase) {
      // Memory Store update
      const current = memoryStore.getPlaybackState(roomId);
      if (!current) {
        return NextResponse.json({ error: 'Room state not found' }, { status: 404 });
      }

      let nextStatus: PlaybackStatus = current.playbackStatus;
      let nextPos = current.basePositionSeconds;
      let nextTrack = current.track;
      let nextProvider = current.provider;
      let nextProviderTrackId = current.providerTrackId;
      let nextQueueItemId = current.currentQueueItemId;

      if (command === 'SELECT_TRACK' && track) {
        nextStatus = 'playing';
        nextPos = positionSeconds || 0;
        nextTrack = track;
        nextProvider = track.provider;
        nextProviderTrackId = track.providerTrackId;
        nextQueueItemId = queueItemId || null;
      } else if (command === 'PLAY' || command === 'RESUME') {
        nextStatus = 'playing';
        nextPos = positionSeconds;
      } else if (command === 'PAUSE') {
        nextStatus = 'paused';
        nextPos = positionSeconds;
      } else if (command === 'SEEK') {
        nextPos = positionSeconds;
      } else if (command === 'SKIP_NEXT') {
        const { nextItem } = memoryStore.advanceQueue(roomId);
        if (nextItem) {
          nextStatus = 'playing';
          nextPos = 0;
          nextTrack = nextItem.track;
          nextProvider = nextItem.track.provider;
          nextProviderTrackId = nextItem.track.providerTrackId;
          nextQueueItemId = nextItem.id;
        } else {
          nextStatus = 'ended';
          nextPos = 0;
        }
      }

      const updated = memoryStore.updatePlayback(roomId, {
        playbackStatus: nextStatus,
        basePositionSeconds: nextPos,
        track: nextTrack,
        provider: nextProvider,
        providerTrackId: nextProviderTrackId,
        updatedBy: userId,
        updatedByName: displayName,
        currentQueueItemId: nextQueueItemId,
      });

      return NextResponse.json({ state: updated }, { status: 200 });
    }

    // Supabase authoritative update
    // Fetch current playback state to ensure monotonic revision
    const { data: currentData, error: fetchErr } = await supabase
      .from('playback_state')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (fetchErr || !currentData) {
      return NextResponse.json({ error: 'Playback state not found' }, { status: 404 });
    }

    const currentRevision = Number(currentData.revision);
    const nextRevision = currentRevision + 1;

    let nextStatus = currentData.playback_status;
    let nextPos = Number(currentData.base_position_seconds);
    let nextTrack = currentData.track_metadata;
    let nextProvider = currentData.provider_id;
    let nextProviderTrackId = currentData.provider_track_id;
    let nextQueueItemId = currentData.current_queue_item_id;

    if (command === 'SELECT_TRACK' && track) {
      nextStatus = 'playing';
      nextPos = positionSeconds || 0;
      nextTrack = track;
      nextProvider = track.provider;
      nextProviderTrackId = track.providerTrackId;
      nextQueueItemId = queueItemId || null;
    } else if (command === 'PLAY' || command === 'RESUME') {
      nextStatus = 'playing';
      nextPos = positionSeconds;
    } else if (command === 'PAUSE') {
      nextStatus = 'paused';
      nextPos = positionSeconds;
    } else if (command === 'SEEK') {
      nextPos = positionSeconds;
    } else if (command === 'SKIP_NEXT') {
      // Find next pending queue item
      const { data: queueItems } = await supabase
        .from('queue_items')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'pending')
        .order('queue_position', { ascending: true })
        .limit(1);

      if (queueItems && queueItems.length > 0) {
        const nextItem = queueItems[0];
        await supabase.from('queue_items').update({ status: 'played' }).eq('id', nextItem.id);
        nextStatus = 'playing';
        nextPos = 0;
        nextTrack = nextItem.track_metadata;
        nextProvider = nextItem.provider_id;
        nextProviderTrackId = nextItem.provider_track_id;
        nextQueueItemId = nextItem.id;
      } else {
        nextStatus = 'ended';
        nextPos = 0;
      }
    }

    const { data: updatedData, error: updateErr } = await supabase
      .from('playback_state')
      .update({
        provider_id: nextProvider,
        provider_track_id: nextProviderTrackId,
        track_metadata: nextTrack,
        playback_status: nextStatus,
        base_position_seconds: nextPos,
        revision: nextRevision,
        updated_at: nowIso,
        updated_by: userId,
        updated_by_name: displayName,
        current_queue_item_id: nextQueueItemId,
      })
      .eq('room_id', roomId)
      .select()
      .single();

    if (updateErr) {
      console.error('Playback update error:', updateErr);
      return NextResponse.json({ error: 'Failed to update playback state' }, { status: 500 });
    }

    const state: PlaybackState = {
      id: updatedData.id,
      roomId: updatedData.room_id,
      provider: updatedData.provider_id,
      providerTrackId: updatedData.provider_track_id,
      track: updatedData.track_metadata,
      playbackStatus: updatedData.playback_status,
      basePositionSeconds: Number(updatedData.base_position_seconds),
      updatedAtServer: updatedData.updated_at,
      revision: Number(updatedData.revision),
      updatedBy: updatedData.updated_by,
      updatedByName: updatedData.updated_by_name,
      currentQueueItemId: updatedData.current_queue_item_id,
    };

    return NextResponse.json({ state }, { status: 200 });
  } catch (err) {
    console.error('Command API error:', err);
    return NextResponse.json(
      { error: 'Failed to execute command', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
