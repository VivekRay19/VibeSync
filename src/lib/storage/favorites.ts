import { NormalizedTrack } from '../types/music';

const STORAGE_KEY = 'vibesync_liked_tracks';

// Initial starter tracks if library is empty
const STARTER_LIKED_TRACKS: NormalizedTrack[] = [
  {
    id: 'verome:u9n7Cw-4_PE',
    provider: 'verome',
    providerTrackId: 'u9n7Cw-4_PE',
    title: 'Die For You',
    artistName: 'The Weeknd',
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop&q=80',
    durationSeconds: 260,
    providerPageUrl: 'https://music.youtube.com/watch?v=u9n7Cw-4_PE',
    playbackType: 'video_embed',
    isPlayable: true,
    attributionText: 'YouTube Music (Verome)',
  },
  {
    id: 'verome:LDY_XReBw9A',
    provider: 'verome',
    providerTrackId: 'LDY_XReBw9A',
    title: 'Snooze',
    artistName: 'SZA',
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop&q=80',
    durationSeconds: 201,
    providerPageUrl: 'https://music.youtube.com/watch?v=LDY_XReBw9A',
    playbackType: 'video_embed',
    isPlayable: true,
  },
];

function getStoredTracks(): NormalizedTrack[] {
  if (typeof window === 'undefined') return STARTER_LIKED_TRACKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with starter tracks on first visit
      localStorage.setItem(STORAGE_KEY, JSON.stringify(STARTER_LIKED_TRACKS));
      return STARTER_LIKED_TRACKS;
    }
    return JSON.parse(raw);
  } catch {
    return STARTER_LIKED_TRACKS;
  }
}

function saveStoredTracks(tracks: NormalizedTrack[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
    window.dispatchEvent(new Event('vibesync_liked_changed'));
  } catch {
    // Ignore storage quota errors
  }
}

export function getLikedTracks(): NormalizedTrack[] {
  return getStoredTracks();
}

export function isTrackLiked(trackId?: string | null): boolean {
  if (!trackId) return false;
  const tracks = getStoredTracks();
  return tracks.some((t) => t.id === trackId || `${t.provider}:${t.providerTrackId}` === trackId);
}

export function toggleLikeTrack(track: NormalizedTrack): boolean {
  const tracks = getStoredTracks();
  const trackId = track.id || `${track.provider}:${track.providerTrackId}`;
  const exists = tracks.some((t) => t.id === trackId || `${t.provider}:${t.providerTrackId}` === trackId);

  let updated: NormalizedTrack[];
  let nowLiked: boolean;

  if (exists) {
    updated = tracks.filter((t) => t.id !== trackId && `${t.provider}:${t.providerTrackId}` !== trackId);
    nowLiked = false;
  } else {
    updated = [track, ...tracks];
    nowLiked = true;
  }

  saveStoredTracks(updated);
  return nowLiked;
}

export function subscribeLikedTracks(callback: (tracks: NormalizedTrack[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    callback(getStoredTracks());
  };

  window.addEventListener('vibesync_liked_changed', handler);
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) handler();
  });

  return () => {
    window.removeEventListener('vibesync_liked_changed', handler);
  };
}
