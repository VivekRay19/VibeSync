export type MusicProviderId = 'audius' | 'youtube' | 'verome';

export type PlaybackType = 'audio_stream' | 'video_embed';

export interface TrackRestrictions {
  embeddable?: boolean;
  regionRestricted?: boolean;
  reason?: string;
}

export interface NormalizedTrack {
  id: string; // provider:providerTrackId
  provider: MusicProviderId;
  providerTrackId: string;
  title: string;
  artistName: string;
  artworkUrl?: string | null;
  durationSeconds: number;
  providerPageUrl: string;
  streamUrl?: string | null;
  playbackType?: PlaybackType;
  restrictions?: TrackRestrictions;
  licenseUrl?: string | null;
  attributionText?: string | null;
  isPlayable: boolean;
  userHandle?: string;
  tags?: string[];
}

export type PlaybackStatus = 'playing' | 'paused' | 'ended' | 'buffering';

export interface PlaybackState {
  id?: string;
  roomId: string;
  provider: MusicProviderId;
  providerTrackId: string;
  track: NormalizedTrack;
  playbackStatus: PlaybackStatus;
  basePositionSeconds: number;
  updatedAtServer: string; // ISO 8601 string
  revision: number;
  updatedBy: string; // user id or display name
  updatedByName?: string;
  currentQueueItemId?: string | null;
  commandId?: string;
  scheduledAt?: number | null;
}

export interface QueueItem {
  id: string;
  roomId: string;
  track: NormalizedTrack;
  addedByUserId: string;
  addedByName: string;
  queuePosition: number;
  createdAt: string;
  status: 'pending' | 'playing' | 'played';
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  role: 'owner' | 'member';
  joinedAt: string;
  isOnline?: boolean;
}

export interface Room {
  id: string;
  roomCode: string;
  name: string;
  ownerId: string;
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface SearchResult {
  tracks: NormalizedTrack[];
  provider: MusicProviderId;
  hasMore: boolean;
  total?: number;
  warning?: string;
}
