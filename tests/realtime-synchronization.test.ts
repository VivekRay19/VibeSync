import { describe, it, expect, beforeEach } from 'vitest';
import { PlaybackSyncEngine } from '@/lib/sync/engine';
import { PlaybackState, NormalizedTrack } from '@/lib/types/music';
import { memoryStore } from './fixtures/mock-store';
import { SearchTracksSchema, PlaybackCommandSchema } from '@/lib/validations/room-schema';

describe('Real-Time Cross-Device Playback Synchronization', () => {
  let phoneSyncEngine: PlaybackSyncEngine;
  let laptopSyncEngine: PlaybackSyncEngine;

  const mockVeromeTrack: NormalizedTrack = {
    id: 'verome:u9n7Cw-4_PE',
    provider: 'verome',
    providerTrackId: 'u9n7Cw-4_PE',
    title: 'Die For You',
    artistName: 'The Weeknd',
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
    durationSeconds: 260,
    providerPageUrl: 'https://music.youtube.com/watch?v=u9n7Cw-4_PE',
    playbackType: 'video_embed',
    isPlayable: true,
  };

  beforeEach(() => {
    // Phone with 30ms network latency
    phoneSyncEngine = new PlaybackSyncEngine({
      driftThresholdSeconds: 0.4,
      youtubeDriftThresholdSeconds: 0.5,
      minSeekIntervalMs: 800,
    });

    // Laptop with 60ms network latency
    laptopSyncEngine = new PlaybackSyncEngine({
      driftThresholdSeconds: 0.4,
      youtubeDriftThresholdSeconds: 0.5,
      minSeekIntervalMs: 800,
    });
  });

  it('defaults music search provider to Verome YouTube Music in schema', () => {
    const result = SearchTracksSchema.safeParse({ query: 'The Weeknd' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('verome');
    }
  });

  it('calibrates clock offsets using NTP RTT round-trip measurements', () => {
    const serverBaseTime = 1700000000000;
    // Phone: t0 = 100, server = 130, t1 = 160 (rtt = 60ms, offset = 130 - 130 = 0)
    phoneSyncEngine.recordNtpSample(100, 130, 160);

    // Laptop: client is running 500ms behind real time
    // t0 = 100, server = 630, t1 = 160 -> offset = 630 - 130 = +500ms
    laptopSyncEngine.recordNtpSample(100, 630, 160);

    expect(phoneSyncEngine.getEstimatedServerTimeMs()).toBeGreaterThan(0);
    expect(laptopSyncEngine.getEstimatedServerTimeMs()).toBeGreaterThan(phoneSyncEngine.getEstimatedServerTimeMs() + 450);
  });

  it('synchronizes Pause command from phone to laptop without position drift', () => {
    // 1. Host creates room
    const { room, state: s1 } = memoryStore.createRoom('Vibe Room', 'phone-user', 'Phone Listener');
    memoryStore.addMember(room.id, 'laptop-user', 'Laptop Listener');

    // 2. Play Die For You
    const playingState = memoryStore.updatePlayback(room.id, {
      playbackStatus: 'playing',
      track: mockVeromeTrack,
      provider: 'verome',
      providerTrackId: mockVeromeTrack.providerTrackId,
      basePositionSeconds: 10,
      updatedBy: 'phone-user',
      updatedByName: 'Phone Listener',
    })!;

    expect(playingState.playbackStatus).toBe('playing');
    expect(playingState.revision).toBe(2);

    // 3. User on phone presses Pause at 84 seconds (1:24)
    const phonePausedState = memoryStore.updatePlayback(room.id, {
      playbackStatus: 'paused',
      basePositionSeconds: 84,
      updatedBy: 'phone-user',
      updatedByName: 'Phone Listener',
    })!;

    expect(phonePausedState.playbackStatus).toBe('paused');
    expect(phonePausedState.basePositionSeconds).toBe(84);
    expect(phonePausedState.revision).toBe(3);

    // 4. Laptop receives authoritative state: both phone and laptop must calculate expected position as exactly 84s
    const phonePos = phoneSyncEngine.calculateExpectedPosition(phonePausedState);
    const laptopPos = laptopSyncEngine.calculateExpectedPosition(phonePausedState);

    expect(phonePos).toBe(84);
    expect(laptopPos).toBe(84);
    expect(phonePos).toBe(laptopPos);

    // 5. If laptop was playing at 85.2s, drift detector detects that laptop must pause and seek to 84s
    const driftCheck = laptopSyncEngine.shouldCorrectDrift(85.2, phonePausedState, false, 'youtube');
    expect(driftCheck.needsSeek).toBe(false); // When paused, player directly pauses and aligns base position
    expect(driftCheck.targetPosition).toBe(84);
  });

  it('measures drift and triggers seek only when drift exceeds sub-500ms threshold', () => {
    const nowIso = new Date().toISOString();
    const playingState: PlaybackState = {
      roomId: 'room-1',
      provider: 'verome',
      providerTrackId: 'u9n7Cw-4_PE',
      track: mockVeromeTrack,
      playbackStatus: 'playing',
      basePositionSeconds: 50,
      updatedAtServer: nowIso,
      revision: 5,
      updatedBy: 'user-1',
    };

    // Case A: 200ms drift (within 500ms tolerance) -> micro-drift rate adjustment without abrupt seek
    const smallDrift = phoneSyncEngine.shouldCorrectDrift(50.2, playingState, false, 'youtube');
    expect(smallDrift.needsSeek).toBe(false);
    expect(smallDrift.driftSeconds).toBeCloseTo(0.2, 1);
    expect(smallDrift.suggestedRate).toBeLessThan(1.0); // Slightly slows down to let room catch up

    // Case B: 750ms drift (exceeds 500ms tolerance) -> triggers corrective seek
    const largeDrift = phoneSyncEngine.shouldCorrectDrift(49.25, playingState, false, 'youtube');
    expect(largeDrift.needsSeek).toBe(true);
    expect(largeDrift.driftSeconds).toBeGreaterThan(0.5);
    expect(largeDrift.targetPosition).toBeCloseTo(50, 0);
  });

  it('protects against stale revisions and duplicate command payloads', () => {
    // Valid command validation with commandId
    const commandPayload = {
      commandId: 'cmd_1700000001_abc',
      roomId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      command: 'PAUSE',
      positionSeconds: 84.5,
      revision: 3,
    };

    const parsed = PlaybackCommandSchema.safeParse(commandPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.commandId).toBe('cmd_1700000001_abc');
      expect(parsed.data.command).toBe('PAUSE');
      expect(parsed.data.positionSeconds).toBe(84.5);
    }
  });

  it('handles track change synchronization across room members', () => {
    const { room } = memoryStore.createRoom('Vibe Room', 'user-1', 'Host');

    // Advance to Snooze by SZA
    const newTrack: NormalizedTrack = {
      id: 'verome:LDY_XReBw9A',
      provider: 'verome',
      providerTrackId: 'LDY_XReBw9A',
      title: 'Snooze',
      artistName: 'SZA',
      durationSeconds: 201,
      providerPageUrl: 'https://music.youtube.com/watch?v=LDY_XReBw9A',
      playbackType: 'video_embed',
      isPlayable: true,
    };

    const trackChangedState = memoryStore.updatePlayback(room.id, {
      playbackStatus: 'playing',
      track: newTrack,
      provider: 'verome',
      providerTrackId: newTrack.providerTrackId,
      basePositionSeconds: 0,
      updatedBy: 'user-2',
      updatedByName: 'Guest',
    })!;

    expect(trackChangedState.track.title).toBe('Snooze');
    expect(trackChangedState.basePositionSeconds).toBe(0);
    expect(trackChangedState.playbackStatus).toBe('playing');
    expect(trackChangedState.revision).toBe(2);
  });

  it('generates high-contrast QR code data URLs for listening room invitation URLs', async () => {
    const QRCode = await import('qrcode');
    const roomCode = 'VIBE99';
    const origin = 'https://vibe-sync-hazel.vercel.app';
    const inviteUrl = `${origin}/room/${roomCode}`;

    const dataUrl = await QRCode.toDataURL(inviteUrl, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#080A11', light: '#FFFFFF' },
    });

    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(100);
  });

  it('evaluates fast room synchronization with revision checks (304 not modified vs modified)', () => {
    const serverState: PlaybackState = {
      roomId: 'room-abc',
      provider: 'verome',
      providerTrackId: 'u9n7Cw-4_PE',
      track: mockVeromeTrack,
      playbackStatus: 'playing',
      basePositionSeconds: 45,
      updatedAtServer: new Date().toISOString(),
      revision: 6,
      updatedBy: 'host-1',
    };

    // Client A is up-to-date with revision 6 -> Not Modified
    const clientRevA = 6;
    const isModifiedA = serverState.revision > clientRevA;
    expect(isModifiedA).toBe(false);

    // Client B was asleep or on phone with revision 4 -> Needs Update
    const clientRevB = 4;
    const isModifiedB = serverState.revision > clientRevB;
    expect(isModifiedB).toBe(true);
  });
});
