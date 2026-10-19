import { describe, it, expect, beforeEach } from 'vitest';
import { PlaybackSyncEngine } from '@/lib/sync/engine';
import { PlaybackState } from '@/lib/types/music';

describe('PlaybackSyncEngine', () => {
  let engine: PlaybackSyncEngine;

  const mockTrack = {
    id: 'audius:test-1',
    provider: 'audius' as const,
    providerTrackId: 'test-1',
    title: 'Test Track',
    artistName: 'Test Artist',
    artworkUrl: null,
    durationSeconds: 240,
    providerPageUrl: 'https://audius.co/track/test-1',
    isPlayable: true,
  };

  beforeEach(() => {
    engine = new PlaybackSyncEngine({
      driftThresholdSeconds: 2.0,
      minSeekIntervalMs: 1000,
    });
  });

  it('keeps fixed position when playback is paused', () => {
    const state: PlaybackState = {
      roomId: 'room-1',
      provider: 'audius',
      providerTrackId: 'test-1',
      track: mockTrack,
      playbackStatus: 'paused',
      basePositionSeconds: 45,
      updatedAtServer: new Date(Date.now() - 10000).toISOString(), // 10s ago
      revision: 1,
      updatedBy: 'user-1',
    };

    const expected = engine.calculateExpectedPosition(state);
    expect(expected).toBe(45);
  });

  it('calculates elapsed position when playback is playing', () => {
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const state: PlaybackState = {
      roomId: 'room-1',
      provider: 'audius',
      providerTrackId: 'test-1',
      track: mockTrack,
      playbackStatus: 'playing',
      basePositionSeconds: 10,
      updatedAtServer: fiveSecondsAgo,
      revision: 1,
      updatedBy: 'user-1',
    };

    const expected = engine.calculateExpectedPosition(state);
    // 10 base + ~5 elapsed = 15s (tolerance ±0.5s)
    expect(expected).toBeGreaterThanOrEqual(14.5);
    expect(expected).toBeLessThanOrEqual(16.5);
  });

  it('clamps expected position to max track duration', () => {
    const longAgo = new Date(Date.now() - 500000).toISOString();
    const state: PlaybackState = {
      roomId: 'room-1',
      provider: 'audius',
      providerTrackId: 'test-1',
      track: mockTrack, // duration: 240s
      playbackStatus: 'playing',
      basePositionSeconds: 200,
      updatedAtServer: longAgo,
      revision: 1,
      updatedBy: 'user-1',
    };

    const expected = engine.calculateExpectedPosition(state);
    expect(expected).toBe(240);
  });

  it('detects when drift exceeds threshold and requires corrective seek', () => {
    const nowIso = new Date().toISOString();
    const state: PlaybackState = {
      roomId: 'room-1',
      provider: 'audius',
      providerTrackId: 'test-1',
      track: mockTrack,
      playbackStatus: 'playing',
      basePositionSeconds: 50,
      updatedAtServer: nowIso,
      revision: 1,
      updatedBy: 'user-1',
    };

    // Client is at 45s (drift is ~5s, exceeds 2.0s threshold)
    const result = engine.shouldCorrectDrift(45, state, false);
    expect(result.needsSeek).toBe(true);
    expect(result.driftSeconds).toBeGreaterThan(2.0);
  });

  it('avoids micro-seeks when drift is within tolerance', () => {
    const nowIso = new Date().toISOString();
    const state: PlaybackState = {
      roomId: 'room-1',
      provider: 'audius',
      providerTrackId: 'test-1',
      track: mockTrack,
      playbackStatus: 'playing',
      basePositionSeconds: 50,
      updatedAtServer: nowIso,
      revision: 1,
      updatedBy: 'user-1',
    };

    // Client is at 49.5s (drift is 0.5s, well within 2.0s threshold)
    const result = engine.shouldCorrectDrift(49.5, state, false);
    expect(result.needsSeek).toBe(false);
  });

  it('does not seek during audio buffering', () => {
    const nowIso = new Date().toISOString();
    const state: PlaybackState = {
      roomId: 'room-1',
      provider: 'audius',
      providerTrackId: 'test-1',
      track: mockTrack,
      playbackStatus: 'playing',
      basePositionSeconds: 50,
      updatedAtServer: nowIso,
      revision: 1,
      updatedBy: 'user-1',
    };

    const result = engine.shouldCorrectDrift(10, state, true); // isBuffering = true
    expect(result.needsSeek).toBe(false);
  });
});
