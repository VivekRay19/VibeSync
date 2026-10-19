import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './client';
import { memoryStore } from './mock-store';
import { Room, RoomMember, PlaybackState, QueueItem, NormalizedTrack } from '../types/music';

let serverSupabaseClient: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  if (!serverSupabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    serverSupabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
      },
    });
  }

  return serverSupabaseClient;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createRoomAction(
  name: string,
  userId: string,
  displayName: string
): Promise<{ room: Room; playbackState: PlaybackState; error?: string }> {
  const supabase = getServerSupabase();

  if (!supabase) {
    // Graceful memory fallback
    const { room, state } = memoryStore.createRoom(name, userId, displayName);
    return { room, playbackState: state };
  }

  try {
    const roomCode = generateRoomCode();
    const now = new Date().toISOString();

    // 1. Insert room
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert({
        room_code: roomCode,
        name,
        owner_id: userId,
        status: 'active',
      })
      .select()
      .single();

    if (roomError || !roomData) {
      throw new Error(roomError?.message || 'Failed to create room in database');
    }

    // 2. Insert owner member
    const { error: memberError } = await supabase.from('room_members').insert({
      room_id: roomData.id,
      user_id: userId,
      display_name: displayName,
      role: 'owner',
    });

    if (memberError) {
      console.error('Member insert error:', memberError);
    }

    // 3. Insert initial playback state (default Audius demo track)
    const initialTrack: NormalizedTrack = {
      id: 'audius:Y96Ry',
      provider: 'audius',
      providerTrackId: 'Y96Ry',
      title: 'Picnic Electronic Music',
      artistName: 'Guido Santiago',
      artworkUrl:
        'https://audius-creator-1.theblueprint.xyz/content/QmUJVrqfL8t2hCSBBTNFtXg59qPuJsaYp59NK6HfTow8Wb/480x480.jpg',
      durationSeconds: 320,
      providerPageUrl: 'https://audius.co/track/Y96Ry',
      streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/Y96Ry/stream?app_name=VIBESYNC',
      attributionText: 'Provided by Guido Santiago on Audius',
      isPlayable: true,
    };

    const { data: pbData, error: pbError } = await supabase
      .from('playback_state')
      .insert({
        room_id: roomData.id,
        provider_id: 'audius',
        provider_track_id: initialTrack.providerTrackId,
        track_metadata: initialTrack,
        playback_status: 'paused',
        base_position_seconds: 0,
        revision: 1,
        updated_by: userId,
        updated_by_name: displayName,
      })
      .select()
      .single();

    if (pbError) {
      console.error('Playback state insert error:', pbError);
    }

    const room: Room = {
      id: roomData.id,
      roomCode: roomData.room_code,
      name: roomData.name,
      ownerId: roomData.owner_id,
      status: roomData.status,
      createdAt: roomData.created_at,
      updatedAt: roomData.updated_at,
    };

    const playbackState: PlaybackState = {
      id: pbData?.id,
      roomId: roomData.id,
      provider: 'audius',
      providerTrackId: initialTrack.providerTrackId,
      track: initialTrack,
      playbackStatus: 'paused',
      basePositionSeconds: 0,
      updatedAtServer: now,
      revision: 1,
      updatedBy: userId,
      updatedByName: displayName,
      currentQueueItemId: null,
    };

    return { room, playbackState };
  } catch (err) {
    console.error('Database create room failed, falling back to memory store:', err);
    const { room, state } = memoryStore.createRoom(name, userId, displayName);
    return { room, playbackState: state };
  }
}

export async function joinRoomAction(
  roomCode: string,
  userId: string,
  displayName: string
): Promise<{
  room: Room | null;
  playbackState: PlaybackState | null;
  members: RoomMember[];
  queue: QueueItem[];
  error?: string;
}> {
  const code = roomCode.trim().toUpperCase();
  const supabase = getServerSupabase();

  if (!supabase) {
    const room = memoryStore.getRoomByCode(code);
    if (!room || room.status === 'closed') {
      return { room: null, playbackState: null, members: [], queue: [], error: 'Room not found or has been closed' };
    }

    memoryStore.addMember(room.id, userId, displayName);
    const state = memoryStore.getPlaybackState(room.id);
    const members = memoryStore.getMembers(room.id);
    const queue = memoryStore.getQueue(room.id);

    return { room, playbackState: state, members, queue };
  }

  try {
    // 1. Fetch room
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', code)
      .eq('status', 'active')
      .single();

    if (roomError || !roomData) {
      return { room: null, playbackState: null, members: [], queue: [], error: 'Room not found or has been closed' };
    }

    // 2. Add or update member
    await supabase.from('room_members').upsert(
      {
        room_id: roomData.id,
        user_id: userId,
        display_name: displayName,
        role: roomData.owner_id === userId ? 'owner' : 'member',
      },
      { onConflict: 'room_id,user_id' }
    );

    // 3. Fetch state, members, queue in parallel
    const [pbRes, membersRes, queueRes] = await Promise.all([
      supabase.from('playback_state').select('*').eq('room_id', roomData.id).single(),
      supabase.from('room_members').select('*').eq('room_id', roomData.id),
      supabase
        .from('queue_items')
        .select('*')
        .eq('room_id', roomData.id)
        .eq('status', 'pending')
        .order('queue_position', { ascending: true }),
    ]);

    const room: Room = {
      id: roomData.id,
      roomCode: roomData.room_code,
      name: roomData.name,
      ownerId: roomData.owner_id,
      status: roomData.status,
      createdAt: roomData.created_at,
      updatedAt: roomData.updated_at,
    };

    const playbackState: PlaybackState = pbRes.data
      ? {
          id: pbRes.data.id,
          roomId: roomData.id,
          provider: pbRes.data.provider_id,
          providerTrackId: pbRes.data.provider_track_id,
          track: pbRes.data.track_metadata,
          playbackStatus: pbRes.data.playback_status,
          basePositionSeconds: Number(pbRes.data.base_position_seconds),
          updatedAtServer: pbRes.data.updated_at,
          revision: Number(pbRes.data.revision),
          updatedBy: pbRes.data.updated_by,
          updatedByName: pbRes.data.updated_by_name || 'Room Member',
          currentQueueItemId: pbRes.data.current_queue_item_id,
        }
      : (memoryStore.getPlaybackState(roomData.id) as PlaybackState);

    const members: RoomMember[] = (membersRes.data || []).map((m) => ({
      id: m.id,
      roomId: m.room_id,
      userId: m.user_id,
      displayName: m.display_name,
      role: m.role,
      joinedAt: m.joined_at,
    }));

    const queue: QueueItem[] = (queueRes.data || []).map((q) => ({
      id: q.id,
      roomId: q.room_id,
      track: q.track_metadata,
      addedByUserId: q.added_by,
      addedByName: q.added_by_name,
      queuePosition: q.queue_position,
      createdAt: q.created_at,
      status: q.status,
    }));

    return { room, playbackState, members, queue };
  } catch (err) {
    console.error('Supabase join failed, checking memory store fallback:', err);
    const room = memoryStore.getRoomByCode(code);
    if (!room) {
      return { room: null, playbackState: null, members: [], queue: [], error: 'Room not found' };
    }
    const state = memoryStore.getPlaybackState(room.id);
    const members = memoryStore.getMembers(room.id);
    const queue = memoryStore.getQueue(room.id);
    return { room, playbackState: state, members, queue };
  }
}
