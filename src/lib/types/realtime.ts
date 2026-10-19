import { NormalizedTrack, PlaybackState, QueueItem } from './music';

export type RealtimeEventType =
  | 'PLAYBACK_SYNC'
  | 'PLAY'
  | 'PAUSE'
  | 'RESUME'
  | 'SEEK'
  | 'TRACK_CHANGE'
  | 'QUEUE_UPDATED'
  | 'ROOM_CLOSED'
  | 'USER_JOINED'
  | 'USER_LEFT';

export interface RealtimePayloadMap {
  PLAYBACK_SYNC: {
    state: PlaybackState;
  };
  PLAY: {
    position: number;
    revision: number;
    triggeredBy: string;
    triggeredByName: string;
    timestamp: number;
  };
  PAUSE: {
    position: number;
    revision: number;
    triggeredBy: string;
    triggeredByName: string;
    timestamp: number;
  };
  RESUME: {
    position: number;
    revision: number;
    triggeredBy: string;
    triggeredByName: string;
    timestamp: number;
  };
  SEEK: {
    position: number;
    revision: number;
    triggeredBy: string;
    triggeredByName: string;
    timestamp: number;
  };
  TRACK_CHANGE: {
    track: NormalizedTrack;
    position: number;
    revision: number;
    triggeredBy: string;
    triggeredByName: string;
    queueItemId?: string | null;
    timestamp: number;
  };
  QUEUE_UPDATED: {
    queue: QueueItem[];
    action: 'add' | 'remove' | 'reorder' | 'advance';
    item?: QueueItem;
  };
  ROOM_CLOSED: {
    roomId: string;
    reason?: string;
  };
  USER_JOINED: {
    userId: string;
    displayName: string;
  };
  USER_LEFT: {
    userId: string;
  };
}

export interface PresenceState {
  userId: string;
  displayName: string;
  isOwner: boolean;
  avatarUrl?: string;
  onlineAt: string;
}
