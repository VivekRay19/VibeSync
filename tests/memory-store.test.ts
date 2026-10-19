import { describe, it, expect, beforeEach } from 'vitest';
import { memoryStore } from '@/lib/supabase/mock-store';
import { NormalizedTrack } from '@/lib/types/music';

describe('MemoryStore Collaborative Engine', () => {
  const sampleTrack: NormalizedTrack = {
    id: 'audius:sample-1',
    provider: 'audius',
    providerTrackId: 'sample-1',
    title: 'Future Beats',
    artistName: 'Synth Master',
    artworkUrl: null,
    durationSeconds: 180,
    providerPageUrl: 'https://audius.co/track/sample-1',
    isPlayable: true,
  };

  const sampleTrack2: NormalizedTrack = {
    id: 'audius:sample-2',
    provider: 'audius',
    providerTrackId: 'sample-2',
    title: 'Neon Nights',
    artistName: 'Retro Wave',
    artworkUrl: null,
    durationSeconds: 210,
    providerPageUrl: 'https://audius.co/track/sample-2',
    isPlayable: true,
  };

  it('creates room with unique room code, owner member, and initial playback state', () => {
    const { room, state } = memoryStore.createRoom('Lo-Fi Lounge', 'user-owner-1', 'OwnerName');
    expect(room.id).toBeDefined();
    expect(room.roomCode).toHaveLength(6);
    expect(room.name).toBe('Lo-Fi Lounge');
    expect(room.ownerId).toBe('user-owner-1');

    expect(state.roomId).toBe(room.id);
    expect(state.revision).toBe(1);
    expect(state.playbackStatus).toBe('paused');
  });

  it('adds and lists participants accurately', () => {
    const { room } = memoryStore.createRoom('Session', 'user-1', 'Alice');
    memoryStore.addMember(room.id, 'user-2', 'Bob');

    const members = memoryStore.getMembers(room.id);
    expect(members).toHaveLength(2);
    expect(members.some((m) => m.displayName === 'Bob')).toBe(true);
  });

  it('manages queue deterministically (FIFO addition and single-advance)', () => {
    const { room } = memoryStore.createRoom('Queue Room', 'user-1', 'Host');

    // Add 2 songs
    const item1 = memoryStore.addQueueItem(room.id, sampleTrack, 'user-1', 'Host');
    const item2 = memoryStore.addQueueItem(room.id, sampleTrack2, 'user-2', 'Guest');

    const currentQueue = memoryStore.getQueue(room.id);
    expect(currentQueue).toHaveLength(2);
    expect(currentQueue[0].track.title).toBe('Future Beats');
    expect(currentQueue[1].track.title).toBe('Neon Nights');

    // Advance queue once
    const { nextItem, remainingQueue } = memoryStore.advanceQueue(room.id);
    expect(nextItem?.id).toBe(item1.id);
    expect(remainingQueue).toHaveLength(1);
    expect(remainingQueue[0].id).toBe(item2.id);

    // Advance queue second time
    const secondAdvance = memoryStore.advanceQueue(room.id);
    expect(secondAdvance.nextItem?.id).toBe(item2.id);
    expect(secondAdvance.remainingQueue).toHaveLength(0);

    // Empty queue advance is safe
    const thirdAdvance = memoryStore.advanceQueue(room.id);
    expect(thirdAdvance.nextItem).toBeNull();
  });

  it('updates playback state with monotonically increasing revision', () => {
    const { room } = memoryStore.createRoom('Revision Room', 'user-1', 'Host');

    const updated1 = memoryStore.updatePlayback(room.id, {
      playbackStatus: 'playing',
      basePositionSeconds: 15,
    });
    expect(updated1?.revision).toBe(2);
    expect(updated1?.playbackStatus).toBe('playing');
    expect(updated1?.basePositionSeconds).toBe(15);

    const updated2 = memoryStore.updatePlayback(room.id, {
      playbackStatus: 'paused',
      basePositionSeconds: 30,
    });
    expect(updated2?.revision).toBe(3);
    expect(updated2?.playbackStatus).toBe('paused');
  });
});
