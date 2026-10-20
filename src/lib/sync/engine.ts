import { PlaybackState } from '../types/music';

export interface SyncConfig {
  driftThresholdSeconds: number; // e.g. 0.4s for audio, 0.5s for video
  youtubeDriftThresholdSeconds: number; // 0.5s for YouTube embed
  minSeekIntervalMs: number; // e.g. 1000ms to avoid rapid seek thrashing
  maxRateAdjustment: number; // e.g. 0.04 (between 0.96x and 1.04x) for smooth micro-drift alignment
}

const DEFAULT_CONFIG: SyncConfig = {
  driftThresholdSeconds: 0.45,
  youtubeDriftThresholdSeconds: 0.55,
  minSeekIntervalMs: 1000,
  maxRateAdjustment: 0.04,
};

export class PlaybackSyncEngine {
  private config: SyncConfig;
  private serverTimeOffsetMs = 0; // serverTime - clientTime (add to Date.now() to get estimated server time)
  private bestRttMs = Infinity;
  private lastSeekTimestamp = 0;
  private isCalibrated = false;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the current estimated server timestamp in milliseconds.
   */
  public getEstimatedServerTimeMs(): number {
    return Date.now() + this.serverTimeOffsetMs;
  }

  /**
   * High precision NTP-style calibration using round-trip time (RTT).
   * Calculates: offset = serverTime - (t0 + t1)/2
   */
  public recordNtpSample(t0: number, serverTimeMs: number, t1: number): void {
    const rtt = Math.max(0, t1 - t0);
    const measuredOffset = serverTimeMs - (t0 + t1) / 2;

    // Favor samples with smaller RTT because they have lower jitter
    if (!this.isCalibrated || rtt < this.bestRttMs) {
      this.bestRttMs = rtt;
      this.serverTimeOffsetMs = measuredOffset;
      this.isCalibrated = true;
    } else {
      // Exponential moving average for stability
      this.serverTimeOffsetMs = this.serverTimeOffsetMs * 0.8 + measuredOffset * 0.2;
    }
  }

  /**
   * Active clock calibration against the /api/sync/time endpoint.
   */
  public async syncServerClock(): Promise<number> {
    if (typeof window === 'undefined') return 0;

    const t0 = performance.now ? performance.timeOrigin + performance.now() : Date.now();
    try {
      const res = await fetch('/api/sync/time', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const t1 = performance.now ? performance.timeOrigin + performance.now() : Date.now();
        const serverTimeMs = data.serverTimestamp || new Date(data.iso).getTime();
        this.recordNtpSample(t0, serverTimeMs, t1);
      }
    } catch {
      // Maintain existing offset if network fetch fails
    }
    return this.serverTimeOffsetMs;
  }

  /**
   * Calibrate the estimated time offset between client machine and server timestamp from an ISO string.
   */
  public calibrateClock(serverTimestampIso: string, estimatedOneWayTripMs = 35): void {
    try {
      const serverTimeMs = new Date(serverTimestampIso).getTime();
      const clientTimeMs = Date.now();
      if (!isNaN(serverTimeMs)) {
        // If we haven't completed an NTP round-trip sample, calibrate from the header/payload
        const candidateOffset = (serverTimeMs + estimatedOneWayTripMs) - clientTimeMs;
        if (!this.isCalibrated) {
          this.serverTimeOffsetMs = candidateOffset;
        } else {
          // Gentle blending if clock is already calibrated
          this.serverTimeOffsetMs = this.serverTimeOffsetMs * 0.9 + candidateOffset * 0.1;
        }
      }
    } catch {
      // Keep existing offset
    }
  }

  /**
   * Calculate the expected playback position in seconds based on authoritative basePosition,
   * current status, and elapsed time since the server updated the state.
   */
  public calculateExpectedPosition(state: PlaybackState): number {
    if (state.playbackStatus !== 'playing') {
      return Math.max(0, state.basePositionSeconds);
    }

    const serverUpdateMs = new Date(state.updatedAtServer).getTime();
    if (isNaN(serverUpdateMs)) {
      return Math.max(0, state.basePositionSeconds);
    }

    const currentServerTimeMs = this.getEstimatedServerTimeMs();
    const elapsedSeconds = Math.max(0, (currentServerTimeMs - serverUpdateMs) / 1000);

    const maxDuration = state.track?.durationSeconds || Infinity;
    const rawExpected = state.basePositionSeconds + elapsedSeconds;

    return Math.min(rawExpected, maxDuration);
  }

  /**
   * Evaluates whether the local audio/video element needs a corrective seek to synchronize with the room.
   * Returns:
   * - needsSeek: boolean (true if drift exceeds threshold and cooldown has passed)
   * - targetPosition: expected position in seconds
   * - driftSeconds: absolute drift in seconds
   * - signedDriftSeconds: (currentLocalTime - expectedPosition) positive if ahead, negative if behind
   * - suggestedRate: subtle playbackRate multiplier (e.g. 1.03x / 0.97x) to eliminate micro-drift smoothly
   */
  public shouldCorrectDrift(
    currentLocalTime: number,
    state: PlaybackState,
    isBuffering = false,
    provider: 'verome' | 'youtube' | 'audius' = 'verome'
  ): {
    needsSeek: boolean;
    targetPosition: number;
    driftSeconds: number;
    signedDriftSeconds: number;
    suggestedRate: number;
  } {
    if (isBuffering || state.playbackStatus !== 'playing') {
      return {
        needsSeek: false,
        targetPosition: state.playbackStatus === 'paused' ? state.basePositionSeconds : currentLocalTime,
        driftSeconds: 0,
        signedDriftSeconds: 0,
        suggestedRate: 1.0,
      };
    }

    const expectedPosition = this.calculateExpectedPosition(state);
    const signedDrift = currentLocalTime - expectedPosition;
    const driftSeconds = Math.abs(signedDrift);

    const threshold =
      provider === 'audius'
        ? this.config.driftThresholdSeconds
        : this.config.youtubeDriftThresholdSeconds;

    const now = Date.now();
    const canSeek = now - this.lastSeekTimestamp >= this.config.minSeekIntervalMs;

    // Hard seek correction if drift exceeds threshold
    if (driftSeconds > threshold && canSeek) {
      return {
        needsSeek: true,
        targetPosition: expectedPosition,
        driftSeconds,
        signedDriftSeconds: signedDrift,
        suggestedRate: 1.0,
      };
    }

    // Micro-drift rate adjustment: if drift is between 150ms and the seek threshold,
    // subtly adjust playback rate to bring playback into sub-50ms sync without jarring audio cut
    let suggestedRate = 1.0;
    if (driftSeconds > 0.15 && driftSeconds <= threshold) {
      if (signedDrift < 0) {
        // Behind room -> speed up slightly
        suggestedRate = 1.0 + this.config.maxRateAdjustment;
      } else {
        // Ahead of room -> slow down slightly
        suggestedRate = 1.0 - this.config.maxRateAdjustment;
      }
    }

    return {
      needsSeek: false,
      targetPosition: expectedPosition,
      driftSeconds,
      signedDriftSeconds: signedDrift,
      suggestedRate,
    };
  }

  public recordSeek(): void {
    this.lastSeekTimestamp = Date.now();
  }
}

// Global sync engine singleton
export const syncEngine = new PlaybackSyncEngine();
