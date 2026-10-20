import { neon } from '@neondatabase/serverless';
import { Room, RoomMember, PlaybackState, QueueItem, NormalizedTrack, PlaybackStatus } from '../types/music';

export const DEFAULT_INITIAL_TRACK: NormalizedTrack = {
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

function getDb() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.STORAGE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.NEON_DATABASE_URL;
  if (!url) {
    throw new Error(
      'Database connection URL is not set. Please set DATABASE_URL or POSTGRES_URL in environment variables.'
    );
  }
  return neon(url);
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createRoom(
  name: string,
  userId: string,
  displayName: string
): Promise<{ room: Room; playbackState: PlaybackState }> {
  const sql = getDb();
  const roomCode = generateRoomCode();

  // 1. Insert room
  const roomRows = await sql`
    INSERT INTO rooms (room_code, name, owner_id, status)
    VALUES (${roomCode}, ${name.trim()}, ${userId}, 'active')
    RETURNING id, room_code, name, owner_id, status, created_at, updated_at
  `;

  if (!roomRows || roomRows.length === 0) {
    throw new Error('Failed to create room in Neon database');
  }

  const rawRoom = roomRows[0];
  const roomId = rawRoom.id as string;

  // 2. Insert owner as initial member
  await sql`
    INSERT INTO room_members (room_id, user_id, display_name, role)
    VALUES (${roomId}, ${userId}, ${displayName.trim()}, 'owner')
    ON CONFLICT (room_id, user_id) DO UPDATE SET display_name = EXCLUDED.display_name
  `;

  // 3. Insert initial playback state
  const pbRows = await sql`
    INSERT INTO playback_state (
      room_id,
      provider_id,
      provider_track_id,
      track_metadata,
      playback_status,
      base_position_seconds,
      revision,
      updated_by,
      updated_by_name
    )
    VALUES (
      ${roomId},
      ${DEFAULT_INITIAL_TRACK.provider},
      ${DEFAULT_INITIAL_TRACK.providerTrackId},
      ${JSON.stringify(DEFAULT_INITIAL_TRACK)}::jsonb,
      'paused',
      0,
      1,
      ${userId},
      ${displayName.trim()}
    )
    RETURNING id, room_id, provider_id, provider_track_id, track_metadata, playback_status,
              base_position_seconds, revision, updated_by, updated_by_name, current_queue_item_id, updated_at
  `;

  const rawPb = pbRows[0];

  const room: Room = {
    id: rawRoom.id,
    roomCode: rawRoom.room_code,
    name: rawRoom.name,
    ownerId: rawRoom.owner_id,
    status: rawRoom.status,
    createdAt: new Date(rawRoom.created_at).toISOString(),
    updatedAt: new Date(rawRoom.updated_at).toISOString(),
  };

  const playbackState: PlaybackState = {
    id: rawPb.id,
    roomId: rawPb.room_id,
    provider: rawPb.provider_id,
    providerTrackId: rawPb.provider_track_id,
    track: typeof rawPb.track_metadata === 'string' ? JSON.parse(rawPb.track_metadata) : rawPb.track_metadata,
    playbackStatus: rawPb.playback_status as PlaybackStatus,
    basePositionSeconds: Number(rawPb.base_position_seconds),
    updatedAtServer: new Date(rawPb.updated_at).toISOString(),
    revision: Number(rawPb.revision),
    updatedBy: rawPb.updated_by,
    updatedByName: rawPb.updated_by_name,
    currentQueueItemId: rawPb.current_queue_item_id || null,
  };

  return { room, playbackState };
}

export async function getRoomByCode(roomCode: string): Promise<Room | null> {
  const sql = getDb();
  const code = roomCode.trim().toUpperCase();

  const rows = await sql`
    SELECT id, room_code, name, owner_id, status, created_at, updated_at, closed_at
    FROM rooms
    WHERE room_code = ${code} AND status = 'active'
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  const r = rows[0];

  return {
    id: r.id,
    roomCode: r.room_code,
    name: r.name,
    ownerId: r.owner_id,
    status: r.status,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    closedAt: r.closed_at ? new Date(r.closed_at).toISOString() : null,
  };
}

export async function getRoomById(roomId: string): Promise<Room | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, room_code, name, owner_id, status, created_at, updated_at, closed_at
    FROM rooms
    WHERE id = ${roomId}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  const r = rows[0];

  return {
    id: r.id,
    roomCode: r.room_code,
    name: r.name,
    ownerId: r.owner_id,
    status: r.status,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    closedAt: r.closed_at ? new Date(r.closed_at).toISOString() : null,
  };
}

export async function joinRoom(
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
  const sql = getDb();
  const room = await getRoomByCode(roomCode);

  if (!room || room.status === 'closed') {
    return {
      room: null,
      playbackState: null,
      members: [],
      queue: [],
      error: 'Room not found or has been closed',
    };
  }

  // Upsert room member
  const role = room.ownerId === userId ? 'owner' : 'member';
  await sql`
    INSERT INTO room_members (room_id, user_id, display_name, role)
    VALUES (${room.id}, ${userId}, ${displayName.trim()}, ${role})
    ON CONFLICT (room_id, user_id)
    DO UPDATE SET display_name = EXCLUDED.display_name
  `;

  // Fetch playback state, members, and queue concurrently
  const [pbRows, memberRows, queueRows] = await Promise.all([
    sql`
      SELECT id, room_id, provider_id, provider_track_id, track_metadata, playback_status,
             base_position_seconds, revision, updated_by, updated_by_name, current_queue_item_id, updated_at
      FROM playback_state
      WHERE room_id = ${room.id}
      LIMIT 1
    `,
    sql`
      SELECT id, room_id, user_id, display_name, role, joined_at
      FROM room_members
      WHERE room_id = ${room.id}
      ORDER BY joined_at ASC
    `,
    sql`
      SELECT id, room_id, provider_id, provider_track_id, track_metadata, added_by,
             added_by_name, queue_position, status, created_at
      FROM queue_items
      WHERE room_id = ${room.id} AND status = 'pending'
      ORDER BY queue_position ASC
    `,
  ]);

  let playbackState: PlaybackState | null = null;
  if (pbRows && pbRows.length > 0) {
    const rawPb = pbRows[0];
    playbackState = {
      id: rawPb.id,
      roomId: rawPb.room_id,
      provider: rawPb.provider_id,
      providerTrackId: rawPb.provider_track_id,
      track: typeof rawPb.track_metadata === 'string' ? JSON.parse(rawPb.track_metadata) : rawPb.track_metadata,
      playbackStatus: rawPb.playback_status as PlaybackStatus,
      basePositionSeconds: Number(rawPb.base_position_seconds),
      updatedAtServer: new Date(rawPb.updated_at).toISOString(),
      revision: Number(rawPb.revision),
      updatedBy: rawPb.updated_by,
      updatedByName: rawPb.updated_by_name,
      currentQueueItemId: rawPb.current_queue_item_id || null,
    };
  }

  const members: RoomMember[] = (memberRows || []).map((row) => {
    const m = row as unknown as { id: string; room_id: string; user_id: string; display_name: string; role: 'owner' | 'member'; joined_at: string | Date };
    return {
      id: m.id,
      roomId: m.room_id,
      userId: m.user_id,
      displayName: m.display_name,
      role: m.role,
      joinedAt: new Date(m.joined_at).toISOString(),
    };
  });

  const queue: QueueItem[] = (queueRows || []).map((row) => {
    const q = row as unknown as { id: string; room_id: string; track_metadata: string | NormalizedTrack; added_by: string; added_by_name: string; queue_position: number; created_at: string | Date; status: 'pending' | 'playing' | 'played' };
    return {
      id: q.id,
      roomId: q.room_id,
      track: typeof q.track_metadata === 'string' ? JSON.parse(q.track_metadata) : q.track_metadata,
      addedByUserId: q.added_by,
      addedByName: q.added_by_name,
      queuePosition: Number(q.queue_position),
      createdAt: new Date(q.created_at).toISOString(),
      status: q.status,
    };
  });

  return { room, playbackState, members, queue };
}

export async function getPlaybackState(roomId: string): Promise<PlaybackState | null> {
  const sql = getDb();
  const pbRows = await sql`
    SELECT id, room_id, provider_id, provider_track_id, track_metadata, playback_status,
           base_position_seconds, revision, updated_by, updated_by_name, current_queue_item_id, updated_at
    FROM playback_state
    WHERE room_id = ${roomId}
    LIMIT 1
  `;

  if (!pbRows || pbRows.length === 0) return null;
  const rawPb = pbRows[0];

  return {
    id: rawPb.id,
    roomId: rawPb.room_id,
    provider: rawPb.provider_id,
    providerTrackId: rawPb.provider_track_id,
    track: typeof rawPb.track_metadata === 'string' ? JSON.parse(rawPb.track_metadata) : rawPb.track_metadata,
    playbackStatus: rawPb.playback_status as PlaybackStatus,
    basePositionSeconds: Number(rawPb.base_position_seconds),
    updatedAtServer: new Date(rawPb.updated_at).toISOString(),
    revision: Number(rawPb.revision),
    updatedBy: rawPb.updated_by,
    updatedByName: rawPb.updated_by_name,
    currentQueueItemId: rawPb.current_queue_item_id || null,
  };
}

// In-memory idempotency cache for duplicate command protection
const commandIdempotencyCache = new Map<string, { state: PlaybackState; timestamp: number }>();

function cleanCommandCache() {
  const now = Date.now();
  commandIdempotencyCache.forEach((entry, id) => {
    if (now - entry.timestamp > 30000) {
      commandIdempotencyCache.delete(id);
    }
  });
}

export async function updatePlaybackCommand(params: {
  roomId: string;
  command: string;
  positionSeconds: number;
  revision: number;
  track?: NormalizedTrack;
  queueItemId?: string | null;
  userId: string;
  displayName: string;
  commandId?: string;
  scheduledAt?: number;
}): Promise<PlaybackState> {
  const { roomId, command, positionSeconds, track, queueItemId, userId, displayName, commandId, scheduledAt } = params;

  // Check idempotency cache to prevent duplicate command processing
  if (commandId) {
    cleanCommandCache();
    const cached = commandIdempotencyCache.get(commandId);
    if (cached) {
      return cached.state;
    }
  }

  const sql = getDb();

  // Fetch current state
  const currentRows = await sql`
    SELECT id, room_id, provider_id, provider_track_id, track_metadata, playback_status,
           base_position_seconds, revision, updated_by, updated_by_name, current_queue_item_id, updated_at
    FROM playback_state
    WHERE room_id = ${roomId}
    LIMIT 1
  `;

  if (!currentRows || currentRows.length === 0) {
    throw new Error(`Playback state not found for room ${roomId}`);
  }

  const current = currentRows[0];
  const nextRevision = Number(current.revision) + 1;

  let nextStatus = current.playback_status as PlaybackStatus;
  let nextPos = Number(current.base_position_seconds);
  let nextTrack = typeof current.track_metadata === 'string' ? JSON.parse(current.track_metadata) : current.track_metadata;
  let nextProvider = current.provider_id;
  let nextProviderTrackId = current.provider_track_id;
  let nextQueueItemId = current.current_queue_item_id;

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
    // Look up next pending queue item
    const queueRows = await sql`
      SELECT id, provider_id, provider_track_id, track_metadata
      FROM queue_items
      WHERE room_id = ${roomId} AND status = 'pending'
      ORDER BY queue_position ASC
      LIMIT 1
    `;

    if (queueRows && queueRows.length > 0) {
      const nextItem = queueRows[0];
      await sql`
        UPDATE queue_items
        SET status = 'played'
        WHERE id = ${nextItem.id}
      `;

      nextStatus = 'playing';
      nextPos = 0;
      nextTrack = typeof nextItem.track_metadata === 'string' ? JSON.parse(nextItem.track_metadata) : nextItem.track_metadata;
      nextProvider = nextItem.provider_id;
      nextProviderTrackId = nextItem.provider_track_id;
      nextQueueItemId = nextItem.id;
    } else {
      nextStatus = 'ended';
      nextPos = 0;
    }
  }

  const updatedRows = await sql`
    UPDATE playback_state
    SET provider_id = ${nextProvider},
        provider_track_id = ${nextProviderTrackId},
        track_metadata = ${JSON.stringify(nextTrack)}::jsonb,
        playback_status = ${nextStatus},
        base_position_seconds = ${nextPos},
        revision = ${nextRevision},
        updated_by = ${userId},
        updated_by_name = ${displayName.trim()},
        current_queue_item_id = ${nextQueueItemId || null},
        updated_at = NOW()
    WHERE room_id = ${roomId}
    RETURNING id, room_id, provider_id, provider_track_id, track_metadata, playback_status,
              base_position_seconds, revision, updated_by, updated_by_name, current_queue_item_id, updated_at
  `;

  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('Failed to update playback state');
  }

  const raw = updatedRows[0];
  const state: PlaybackState = {
    id: raw.id,
    roomId: raw.room_id,
    provider: raw.provider_id,
    providerTrackId: raw.provider_track_id,
    track: typeof raw.track_metadata === 'string' ? JSON.parse(raw.track_metadata) : raw.track_metadata,
    playbackStatus: raw.playback_status as PlaybackStatus,
    basePositionSeconds: Number(raw.base_position_seconds),
    updatedAtServer: new Date(raw.updated_at).toISOString(),
    revision: Number(raw.revision),
    updatedBy: raw.updated_by,
    updatedByName: raw.updated_by_name,
    currentQueueItemId: raw.current_queue_item_id || null,
    commandId,
    scheduledAt: scheduledAt || null,
  };

  if (commandId) {
    commandIdempotencyCache.set(commandId, { state, timestamp: Date.now() });
  }

  return state;
}

export async function getQueue(roomId: string): Promise<QueueItem[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, room_id, provider_id, provider_track_id, track_metadata, added_by,
           added_by_name, queue_position, status, created_at
    FROM queue_items
    WHERE room_id = ${roomId} AND status = 'pending'
    ORDER BY queue_position ASC
  `;

  return (rows || []).map((row) => {
    const q = row as unknown as { id: string; room_id: string; track_metadata: string | NormalizedTrack; added_by: string; added_by_name: string; queue_position: number; created_at: string | Date; status: 'pending' | 'playing' | 'played' };
    return {
      id: q.id,
      roomId: q.room_id,
      track: typeof q.track_metadata === 'string' ? JSON.parse(q.track_metadata) : q.track_metadata,
      addedByUserId: q.added_by,
      addedByName: q.added_by_name,
      queuePosition: Number(q.queue_position),
      createdAt: new Date(q.created_at).toISOString(),
      status: q.status,
    };
  });
}

export async function addQueueItem(
  roomId: string,
  track: NormalizedTrack,
  userId: string,
  displayName: string
): Promise<QueueItem> {
  const sql = getDb();

  // Find max position
  const countRows = await sql`
    SELECT COALESCE(MAX(queue_position), -1) + 1 AS next_pos
    FROM queue_items
    WHERE room_id = ${roomId} AND status = 'pending'
  `;

  const nextPos = countRows?.[0]?.next_pos ?? 0;

  const rows = await sql`
    INSERT INTO queue_items (
      room_id,
      provider_id,
      provider_track_id,
      track_metadata,
      added_by,
      added_by_name,
      queue_position,
      status
    )
    VALUES (
      ${roomId},
      ${track.provider},
      ${track.providerTrackId},
      ${JSON.stringify(track)}::jsonb,
      ${userId},
      ${displayName.trim()},
      ${nextPos},
      'pending'
    )
    RETURNING id, room_id, provider_id, provider_track_id, track_metadata, added_by,
              added_by_name, queue_position, status, created_at
  `;

  if (!rows || rows.length === 0) {
    throw new Error('Failed to insert queue item');
  }

  const q = rows[0];
  return {
    id: q.id,
    roomId: q.room_id,
    track: typeof q.track_metadata === 'string' ? JSON.parse(q.track_metadata) : q.track_metadata,
    addedByUserId: q.added_by,
    addedByName: q.added_by_name,
    queuePosition: Number(q.queue_position),
    createdAt: new Date(q.created_at).toISOString(),
    status: q.status,
  };
}

export async function removeQueueItem(roomId: string, queueItemId: string): Promise<boolean> {
  const sql = getDb();
  await sql`
    DELETE FROM queue_items
    WHERE id = ${queueItemId} AND room_id = ${roomId}
  `;
  return true;
}

export async function getMembers(roomId: string): Promise<RoomMember[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, room_id, user_id, display_name, role, joined_at
    FROM room_members
    WHERE room_id = ${roomId}
    ORDER BY joined_at ASC
  `;

  return (rows || []).map((row) => {
    const m = row as unknown as { id: string; room_id: string; user_id: string; display_name: string; role: 'owner' | 'member'; joined_at: string | Date };
    return {
      id: m.id,
      roomId: m.room_id,
      userId: m.user_id,
      displayName: m.display_name,
      role: m.role,
      joinedAt: new Date(m.joined_at).toISOString(),
    };
  });
}

export async function kickMember(
  roomId: string,
  callerUserId: string,
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  const sql = getDb();
  const room = await getRoomById(roomId);

  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  if (room.ownerId !== callerUserId) {
    return { success: false, error: 'Only the room owner can kick members' };
  }

  await sql`
    DELETE FROM room_members
    WHERE room_id = ${roomId} AND user_id = ${targetUserId}
  `;

  return { success: true };
}

export async function closeRoom(
  roomId: string,
  callerUserId: string
): Promise<{ success: boolean; error?: string }> {
  const sql = getDb();
  const room = await getRoomById(roomId);

  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  if (room.ownerId !== callerUserId) {
    return { success: false, error: 'Only the room owner can close the room' };
  }

  await sql`
    UPDATE rooms
    SET status = 'closed', closed_at = NOW(), updated_at = NOW()
    WHERE id = ${roomId}
  `;

  return { success: true };
}
