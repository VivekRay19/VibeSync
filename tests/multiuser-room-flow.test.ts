import { describe, it, expect, beforeEach } from 'vitest';
import { memoryStore } from './fixtures/mock-store';
import { providerRegistry } from '@/lib/providers/provider-registry';
import { NormalizedTrack } from '@/lib/types/music';

describe('Multi-User Collaborative Room Simulation', () => {
  beforeEach(() => {
    // Fresh setup
  });

  it('runs complete multi-user collaborative listening flow', async () => {
    // 1. User A (Alice) creates a room
    const aliceId = 'user-alice-123';
    const aliceName = 'Alice';
    const { room, state: initialState } = memoryStore.createRoom('Synthwave Chill', aliceId, aliceName);

    expect(room.name).toBe('Synthwave Chill');
    expect(room.ownerId).toBe(aliceId);
    expect(room.roomCode).toHaveLength(6);
    expect(initialState.playbackStatus).toBe('paused');
    expect(initialState.revision).toBe(1);

    // 2. User B (Bob) joins using the invitation room code
    const bobId = 'user-bob-456';
    const bobName = 'Bob';
    const joinedRoom = memoryStore.getRoomByCode(room.roomCode);
    expect(joinedRoom).toBeDefined();

    memoryStore.addMember(room.id, bobId, bobName);
    const members = memoryStore.getMembers(room.id);
    expect(members).toHaveLength(2);
    expect(members.map((m) => m.displayName)).toContain('Alice');
    expect(members.map((m) => m.displayName)).toContain('Bob');

    // 3. User A searches for a track from provider catalog
    const searchResults = await providerRegistry.search('electronic', 'audius', 1, 5);
    expect(searchResults.tracks.length).toBeGreaterThan(0);
    const selectedTrack = searchResults.tracks[0];

    // 4. User A selects track and starts playback
    const stateAfterSelect = memoryStore.updatePlayback(room.id, {
      playbackStatus: 'playing',
      track: selectedTrack,
      provider: selectedTrack.provider,
      providerTrackId: selectedTrack.providerTrackId,
      basePositionSeconds: 0,
      updatedBy: aliceId,
      updatedByName: aliceName,
    });

    expect(stateAfterSelect?.revision).toBe(2);
    expect(stateAfterSelect?.playbackStatus).toBe('playing');
    expect(stateAfterSelect?.track.title).toBe(selectedTrack.title);
    expect(stateAfterSelect?.updatedByName).toBe('Alice');

    // 5. User B (collaborative listener) pauses the song at 45.5s
    const stateAfterBobPause = memoryStore.updatePlayback(room.id, {
      playbackStatus: 'paused',
      basePositionSeconds: 45.5,
      updatedBy: bobId,
      updatedByName: bobName,
    });

    expect(stateAfterBobPause?.revision).toBe(3);
    expect(stateAfterBobPause?.playbackStatus).toBe('paused');
    expect(stateAfterBobPause?.basePositionSeconds).toBe(45.5);
    expect(stateAfterBobPause?.updatedByName).toBe('Bob');

    // 6. User A resumes playback
    const stateAfterResume = memoryStore.updatePlayback(room.id, {
      playbackStatus: 'playing',
      basePositionSeconds: 45.5,
      updatedBy: aliceId,
      updatedByName: aliceName,
    });

    expect(stateAfterResume?.revision).toBe(4);
    expect(stateAfterResume?.playbackStatus).toBe('playing');

    // 7. User B queues an upcoming song
    const queuedTrack: NormalizedTrack = {
      id: 'audius:queued-99',
      provider: 'audius',
      providerTrackId: 'queued-99',
      title: 'Midnight Drive',
      artistName: 'Retro Synth',
      durationSeconds: 200,
      providerPageUrl: 'https://audius.co/track/queued-99',
      isPlayable: true,
    };

    const queueItem = memoryStore.addQueueItem(room.id, queuedTrack, bobId, bobName);
    expect(queueItem.addedByName).toBe('Bob');
    expect(queueItem.track.title).toBe('Midnight Drive');

    const roomQueue = memoryStore.getQueue(room.id);
    expect(roomQueue).toHaveLength(1);
    expect(roomQueue[0].id).toBe(queueItem.id);

    // 8. User A seeks to 195 seconds (near song end)
    const stateAfterSeek = memoryStore.updatePlayback(room.id, {
      basePositionSeconds: 195,
      updatedBy: aliceId,
      updatedByName: aliceName,
    });
    expect(stateAfterSeek?.revision).toBe(5);
    expect(stateAfterSeek?.basePositionSeconds).toBe(195);

    // 9. Song ends -> room advances queue deterministically
    const { nextItem, remainingQueue } = memoryStore.advanceQueue(room.id);
    expect(nextItem?.id).toBe(queueItem.id);
    expect(remainingQueue).toHaveLength(0);

    const stateAfterNextSong = memoryStore.updatePlayback(room.id, {
      playbackStatus: 'playing',
      track: nextItem!.track,
      provider: nextItem!.track.provider,
      providerTrackId: nextItem!.track.providerTrackId,
      basePositionSeconds: 0,
      currentQueueItemId: nextItem!.id,
    });

    expect(stateAfterNextSong?.revision).toBe(6);
    expect(stateAfterNextSong?.track.title).toBe('Midnight Drive');

    // 10. Late joiner Charlie arrives mid-song
    const charlieId = 'user-charlie-789';
    memoryStore.addMember(room.id, charlieId, 'Charlie');
    const charlieState = memoryStore.getPlaybackState(room.id);
    expect(charlieState?.track.title).toBe('Midnight Drive');
    expect(charlieState?.revision).toBe(6);

    // 11. Room owner removes a participant (moderation)
    memoryStore.removeMember(room.id, charlieId);
    const membersAfterKick = memoryStore.getMembers(room.id);
    expect(membersAfterKick.some((m) => m.userId === charlieId)).toBe(false);
  });
});
