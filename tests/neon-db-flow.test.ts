import { describe, it, expect, afterAll } from 'vitest';
import {
  createRoom,
  getRoomByCode,
  getRoomById,
  joinRoom,
  updatePlaybackCommand,
  addQueueItem,
  getQueue,
  removeQueueItem,
  kickMember,
  closeRoom,
  DEFAULT_INITIAL_TRACK,
} from '@/lib/neon/db';
import { neon } from '@neondatabase/serverless';
import { NormalizedTrack } from '@/lib/types/music';

describe('Neon Database Collaborative Lifecycle Flow', () => {
  let createdRoomId: string | null = null;
  let testRoomCode: string | null = null;
  const ownerId = `test_owner_${Math.random().toString(36).substring(2, 8)}`;
  const guestId = `test_guest_${Math.random().toString(36).substring(2, 8)}`;

  const sampleTrack: NormalizedTrack = {
    id: 'audius:sample_neon_track_1',
    provider: 'audius',
    providerTrackId: 'sample_neon_track_1',
    title: 'Neon Odyssey',
    artistName: 'Cyber Pilot',
    durationSeconds: 240,
    providerPageUrl: 'https://audius.co/track/sample_neon_track_1',
    streamUrl: 'https://audius.co/stream/1',
    isPlayable: true,
  };

  const sampleYouTubeTrack: NormalizedTrack = {
    id: 'youtube:KRUWn3dLoRg',
    provider: 'youtube',
    providerTrackId: 'KRUWn3dLoRg',
    title: 'Ghost (Official Music Video)',
    artistName: 'Justin Bieber',
    durationSeconds: 213,
    providerPageUrl: 'https://www.youtube.com/watch?v=KRUWn3dLoRg',
    artworkUrl: 'https://i.ytimg.com/vi/KRUWn3dLoRg/hqdefault.jpg',
    isPlayable: true,
  };

  afterAll(async () => {
    if (createdRoomId && process.env.DATABASE_URL) {
      const sql = neon(process.env.DATABASE_URL);
      await sql`DELETE FROM rooms WHERE id = ${createdRoomId}`;
    }
  });

  it('creates room with initial playback state and owner member in Neon Postgres', async () => {
    const { room, playbackState } = await createRoom('Neon Synth Lounge', ownerId, 'Alice Host');

    expect(room.id).toBeDefined();
    expect(room.roomCode).toHaveLength(6);
    expect(room.name).toBe('Neon Synth Lounge');
    expect(room.ownerId).toBe(ownerId);
    expect(room.status).toBe('active');

    expect(playbackState.roomId).toBe(room.id);
    expect(playbackState.revision).toBe(1);
    expect(playbackState.playbackStatus).toBe('paused');
    expect(playbackState.track.title).toBe(DEFAULT_INITIAL_TRACK.title);

    createdRoomId = room.id;
    testRoomCode = room.roomCode;
  });

  it('fetches room by code and ID', async () => {
    expect(testRoomCode).not.toBeNull();
    const fetchedByCode = await getRoomByCode(testRoomCode!);
    expect(fetchedByCode).not.toBeNull();
    expect(fetchedByCode?.id).toBe(createdRoomId);

    const fetchedById = await getRoomById(createdRoomId!);
    expect(fetchedById).not.toBeNull();
    expect(fetchedById?.roomCode).toBe(testRoomCode);
  });

  it('allows a guest to join the room', async () => {
    expect(testRoomCode).not.toBeNull();
    const result = await joinRoom(testRoomCode!, guestId, 'Bob Listener');

    expect(result.room).not.toBeNull();
    expect(result.playbackState).not.toBeNull();
    expect(result.members.length).toBeGreaterThanOrEqual(2);

    const guestMember = result.members.find((m) => m.userId === guestId);
    expect(guestMember).toBeDefined();
    expect(guestMember?.displayName).toBe('Bob Listener');
    expect(guestMember?.role).toBe('member');
  });

  it('updates playback commands with monotonic revision increments', async () => {
    expect(createdRoomId).not.toBeNull();

    // 1. Play
    const playState = await updatePlaybackCommand({
      roomId: createdRoomId!,
      command: 'PLAY',
      positionSeconds: 10,
      revision: 1,
      userId: ownerId,
      displayName: 'Alice Host',
    });
    expect(playState.revision).toBe(2);
    expect(playState.playbackStatus).toBe('playing');
    expect(playState.basePositionSeconds).toBe(10);

    // 2. Pause
    const pauseState = await updatePlaybackCommand({
      roomId: createdRoomId!,
      command: 'PAUSE',
      positionSeconds: 25.5,
      revision: 2,
      userId: guestId,
      displayName: 'Bob Listener',
    });
    expect(pauseState.revision).toBe(3);
    expect(pauseState.playbackStatus).toBe('paused');
    expect(pauseState.basePositionSeconds).toBe(25.5);

    // 3. Seek
    const seekState = await updatePlaybackCommand({
      roomId: createdRoomId!,
      command: 'SEEK',
      positionSeconds: 120,
      revision: 3,
      userId: ownerId,
      displayName: 'Alice Host',
    });
    expect(seekState.revision).toBe(4);
    expect(seekState.basePositionSeconds).toBe(120);

    // 4. Select Track
    const selectState = await updatePlaybackCommand({
      roomId: createdRoomId!,
      command: 'SELECT_TRACK',
      positionSeconds: 0,
      revision: 4,
      track: sampleTrack,
      userId: guestId,
      displayName: 'Bob Listener',
    });
    expect(selectState.revision).toBe(5);
    expect(selectState.playbackStatus).toBe('playing');
    expect(selectState.track.title).toBe('Neon Odyssey');
  });

  it('manages queue operations: add, list, remove, and advance next track', async () => {
    expect(createdRoomId).not.toBeNull();

    const queuedTrack: NormalizedTrack = {
      id: 'audius:sample_queued_neon',
      provider: 'audius',
      providerTrackId: 'sample_queued_neon',
      title: 'Midnight Cruiser',
      artistName: 'Retro Neon',
      durationSeconds: 195,
      providerPageUrl: 'https://audius.co/track/sample_queued_neon',
      isPlayable: true,
    };

    // Add item
    const item = await addQueueItem(createdRoomId!, queuedTrack, guestId, 'Bob Listener');
    expect(item.id).toBeDefined();
    expect(item.track.title).toBe('Midnight Cruiser');
    expect(item.queuePosition).toBe(0);

    // List queue
    const queue = await getQueue(createdRoomId!);
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(item.id);

    // Advance queue via SKIP_NEXT
    const skipState = await updatePlaybackCommand({
      roomId: createdRoomId!,
      command: 'SKIP_NEXT',
      positionSeconds: 0,
      revision: 5,
      userId: ownerId,
      displayName: 'Alice Host',
    });

    expect(skipState.revision).toBe(6);
    expect(skipState.track.title).toBe('Midnight Cruiser');
    expect(skipState.currentQueueItemId).toBe(item.id);

    // Verify queue is now empty of pending items
    const queueAfterSkip = await getQueue(createdRoomId!);
    expect(queueAfterSkip.length).toBe(0);
  });

  it('supports YouTube tracks in playback and queue with Neon DB check constraints', async () => {
    expect(createdRoomId).not.toBeNull();

    // 1. Select YouTube track
    const selectYouTube = await updatePlaybackCommand({
      roomId: createdRoomId!,
      command: 'SELECT_TRACK',
      positionSeconds: 0,
      revision: 6,
      track: sampleYouTubeTrack,
      userId: ownerId,
      displayName: 'Alice Host',
    });

    expect(selectYouTube.revision).toBe(7);
    expect(selectYouTube.provider).toBe('youtube');
    expect(selectYouTube.providerTrackId).toBe('KRUWn3dLoRg');
    expect(selectYouTube.track.title).toBe('Ghost (Official Music Video)');
    expect(selectYouTube.track.provider).toBe('youtube');

    // 2. Add YouTube track to queue
    const queueItem = await addQueueItem(createdRoomId!, sampleYouTubeTrack, guestId, 'Bob Listener');
    expect(queueItem.id).toBeDefined();
    expect(queueItem.track.provider).toBe('youtube');
    expect(queueItem.track.providerTrackId).toBe('KRUWn3dLoRg');

    // 3. Remove item from queue
    const removeSuccess = await removeQueueItem(createdRoomId!, queueItem.id);
    expect(removeSuccess).toBe(true);
  });

  it('supports Verome tracks in playback and queue with Neon DB check constraints', async () => {
    expect(createdRoomId).not.toBeNull();

    const sampleVeromeTrack: NormalizedTrack = {
      id: 'verome:dQw4w9WgXcQ',
      provider: 'verome',
      providerTrackId: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      artistName: 'Rick Astley',
      durationSeconds: 213,
      providerPageUrl: 'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
      isPlayable: true,
    };

    // 1. Select Verome track
    const selectVerome = await updatePlaybackCommand({
      roomId: createdRoomId!,
      command: 'SELECT_TRACK',
      positionSeconds: 0,
      revision: 8,
      userId: ownerId,
      displayName: 'Alice Host',
      track: sampleVeromeTrack,
    });

    expect(selectVerome.provider).toBe('verome');
    expect(selectVerome.providerTrackId).toBe('dQw4w9WgXcQ');
    expect(selectVerome.track.provider).toBe('verome');

    // 2. Add Verome track to queue
    const queueItem = await addQueueItem(createdRoomId!, sampleVeromeTrack, guestId, 'Bob Listener');
    expect(queueItem.id).toBeDefined();
    expect(queueItem.track.provider).toBe('verome');
    expect(queueItem.track.providerTrackId).toBe('dQw4w9WgXcQ');

    // 3. Remove item from queue
    const removeSuccess = await removeQueueItem(createdRoomId!, queueItem.id);
    expect(removeSuccess).toBe(true);
  });

  it('enforces moderation permissions: kick and room close', async () => {
    expect(createdRoomId).not.toBeNull();

    // Guest cannot kick owner
    const failKick = await kickMember(createdRoomId!, guestId, ownerId);
    expect(failKick.success).toBe(false);

    // Owner can kick guest
    const kickResult = await kickMember(createdRoomId!, ownerId, guestId);
    expect(kickResult.success).toBe(true);

    // Guest cannot close room
    const failClose = await closeRoom(createdRoomId!, guestId);
    expect(failClose.success).toBe(false);

    // Owner closes room
    const closeResult = await closeRoom(createdRoomId!, ownerId);
    expect(closeResult.success).toBe(true);

    // Closed room cannot be found as active
    const closedRoom = await getRoomByCode(testRoomCode!);
    expect(closedRoom).toBeNull();
  });
});
