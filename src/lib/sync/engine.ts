import { PlaybackState } from '../types/music';

export interface SyncConfig {
  driftThresholdSeconds: number; // e.g. 2.0 seconds
  minSeekIntervalMs: number; // e.g. 1000ms to avoid rapid seek thrashing
}

const DEFAULT_CONFIG: SyncConfig = {
  driftThresholdSeconds: 2.0,
  minSeekIntervalMs: 1200,
};

export class PlaybackSyncEngine {
  private config: SyncConfig;
  private serverTimeOffsetMs = 0; // clientTime - serverTime
  private lastSeekTimestamp = 0;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calibrate the estimated time offset between client machine and server timestamp.
   */
  public calibrateClock(serverTimestampIso: string): void {
    try {
      const serverTimeMs = new Date(serverTimestampIso).getTime();
      const clientTimeMs = Date.now();
      if (!isNaN(serverTimeMs)) {
        this.serverTimeOffsetMs = clientTimeMs - serverTimeMs;
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

    const currentServerTimeMs = Date.now() - this.serverTimeOffsetMs;
    const elapsedSeconds = Math.max(0, (currentServerTimeMs - serverUpdateMs) / 1000);

    const maxDuration = state.track?.durationSeconds || Infinity;
    const rawExpected = state.basePositionSeconds + elapsedSeconds;

    return Math.min(rawExpected, maxDuration);
  }

  /**
   * Evaluates whether the local audio element needs a corrective seek to synchronize with the room.
   * Returns null if drift is within acceptable tolerance, or the target position if a seek is required.
   */
  public shouldCorrectDrift(
    currentLocalTime: number,
    state: PlaybackState,
    isBuffering = false
  ): { needsSeek: boolean; targetPosition: number; driftSeconds: number } {
    if (isBuffering) {
      return { needsSeek: false, targetPosition: currentLocalTime, driftSeconds: 0 };
    }

    const expectedPosition = this.calculateExpectedPosition(state);
    const driftSeconds = Math.abs(currentLocalTime - expectedPosition);

    const now = Date.now();
    const canSeek = now - this.lastSeekTimestamp >= this.config.minSeekIntervalMs;

    if (driftSeconds > this.config.driftThresholdSeconds && canSeek) {
      return {
        needsSeek: true,
        targetPosition: expectedPosition,
        driftSeconds,
      };
    }

    return {
      needsSeek: false,
      targetPosition: expectedPosition,
      driftSeconds,
    };
  }

  public recordSeek(): void {
    this.lastSeekTimestamp = Date.now();
  }
}

// Global sync engine helper
export const syncEngine = new PlaybackSyncEngine();
