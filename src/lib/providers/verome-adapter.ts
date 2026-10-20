import { MusicProvider, ProviderHealth } from './provider-interface';
import { NormalizedTrack, SearchResult } from '../types/music';

interface VeromeArtist {
  name: string;
  id?: string;
}

interface VeromeThumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface VeromeSearchResultItem {
  title?: string;
  videoId?: string;
  id?: string;
  browseId?: string;
  artists?: VeromeArtist[] | string;
  author?: string;
  duration?: string | number;
  lengthSeconds?: string | number;
  thumbnails?: VeromeThumbnail[];
  thumbnail?: string;
  resultType?: string;
  isTopResult?: boolean;
}

interface VeromeSearchResponse {
  query?: string;
  filter?: string;
  results?: VeromeSearchResultItem[];
  continuationToken?: string | null;
  error?: string;
}

export interface VeromeLyricsResponse {
  success: boolean;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  plainLyrics?: string;
  syncedLyrics?: string;
  error?: string;
}

/**
 * Parses time formats such as "03:45", "1:15:20", or integer seconds into total seconds.
 */
function parseDurationSeconds(duration: string | number | undefined): number {
  if (!duration) return 0;
  if (typeof duration === 'number') return duration;
  if (typeof duration === 'string') {
    const clean = duration.trim();
    if (clean.includes(':')) {
      const parts = clean.split(':').map((p) => parseInt(p, 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1];
      }
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export class VeromeAdapter implements MusicProvider {
  readonly id = 'verome' as const;
  readonly name = 'Verome (YouTube Music)';
  readonly playbackType = 'video_embed' as const;

  private baseUrl: string;

  constructor(customBaseUrl?: string) {
    this.baseUrl = (
      customBaseUrl ||
      process.env.VEROME_API_BASE_URL ||
      'http://localhost:8000'
    ).replace(/\/+$/, '');
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.baseUrl.trim().length > 0);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private normalize(item: VeromeSearchResultItem): NormalizedTrack | null {
    const videoId = item.videoId || item.id;
    if (!videoId) return null;

    let artistName = 'Unknown Artist';
    if (Array.isArray(item.artists) && item.artists.length > 0) {
      artistName = item.artists.map((a) => (typeof a === 'string' ? a : a.name)).filter(Boolean).join(', ');
    } else if (typeof item.artists === 'string') {
      artistName = item.artists;
    } else if (item.author) {
      artistName = item.author;
    }

    const title = (item.title || 'Unknown Title').trim();
    const artworkUrl = item.thumbnails?.[0]?.url || item.thumbnail || null;
    const durationSeconds = parseDurationSeconds(item.duration || item.lengthSeconds);

    return {
      id: `verome:${videoId}`,
      provider: 'verome',
      providerTrackId: videoId,
      title,
      artistName,
      artworkUrl,
      durationSeconds,
      providerPageUrl: `https://music.youtube.com/watch?v=${videoId}`,
      streamUrl: null, // Embed playback via official YouTube IFrame Player; direct proxying avoided for SSRF safety & compliance
      playbackType: 'video_embed',
      restrictions: {
        embeddable: true,
      },
      attributionText: `Song "${title}" by ${artistName} on YouTube Music via Verome`,
      isPlayable: true,
    };
  }

  async searchTracks(query: string, _page = 1, limit = 20): Promise<SearchResult> {
    void _page;
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { tracks: [], provider: this.id, hasMore: false, total: 0 };
    }

    try {
      const url = new URL(`${this.baseUrl}/api/search`);
      url.searchParams.set('q', cleanQuery);
      url.searchParams.set('filter', 'songs');

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return {
          tracks: [],
          provider: this.id,
          hasMore: false,
          total: 0,
          warning: `Verome service responded with status ${res.status}`,
        };
      }

      const data: VeromeSearchResponse = await res.json();
      const rawResults = data.results || [];
      const tracks: NormalizedTrack[] = rawResults
        .map((item) => this.normalize(item))
        .filter((t): t is NormalizedTrack => t !== null)
        .slice(0, limit);

      return {
        tracks,
        provider: this.id,
        hasMore: Boolean(data.continuationToken),
        total: tracks.length,
      };
    } catch (err) {
      // Graceful fallback when Verome local Deno instance is not running
      return {
        tracks: [],
        provider: this.id,
        hasMore: false,
        total: 0,
        warning: `Verome API unreachable at ${this.baseUrl}: ${err instanceof Error ? err.message : 'Network failure'}`,
      };
    }
  }

  async getTrack(providerTrackId: string): Promise<NormalizedTrack | null> {
    if (!providerTrackId) return null;

    try {
      const url = `${this.baseUrl}/api/songs/${encodeURIComponent(providerTrackId)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return null;
      const data = await res.json();
      return this.normalize(data);
    } catch {
      return null;
    }
  }

  async getPlayableSource(providerTrackId: string): Promise<string | null> {
    // Playback is powered by official embedded IFrame Player using YouTube video ID
    return providerTrackId ? `https://www.youtube.com/watch?v=${providerTrackId}` : null;
  }

  getAttribution(track: NormalizedTrack): string {
    return track.attributionText || `Song "${track.title}" by ${track.artistName} on YouTube Music via Verome`;
  }

  getProviderPageUrl(track: NormalizedTrack): string {
    return track.providerPageUrl || `https://music.youtube.com/watch?v=${track.providerTrackId}`;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const url = `${this.baseUrl}/health`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        return {
          healthy: true,
          latencyMs,
          message: 'Verome API operational',
        };
      }
      return {
        healthy: false,
        latencyMs,
        message: `Verome API returned status ${res.status}`,
      };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        message: `Verome API offline at ${this.baseUrl}: ${err instanceof Error ? err.message : 'Unreachable'}`,
      };
    }
  }

  /**
   * Search suggestions helper (/api/search/suggestions?q=)
   */
  async getSearchSuggestions(query: string): Promise<string[]> {
    const clean = query.trim();
    if (!clean) return [];

    try {
      const url = new URL(`${this.baseUrl}/api/search/suggestions`);
      url.searchParams.set('q', clean);
      url.searchParams.set('music', '1');

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.suggestions) ? data.suggestions : [];
    } catch {
      return [];
    }
  }

  /**
   * Lyrics retrieval (/api/lyrics?title=&artist=&duration=) with LRCLib direct fallback
   */
  async getLyrics(title: string, artist: string, duration?: number): Promise<VeromeLyricsResponse> {
    const cleanTitle = title.trim();
    const cleanArtist = artist.trim();
    if (!cleanTitle || !cleanArtist) {
      return { success: false, error: 'Missing title or artist' };
    }

    // 1. Try Verome instance
    try {
      const url = new URL(`${this.baseUrl}/api/lyrics`);
      url.searchParams.set('title', cleanTitle);
      url.searchParams.set('artist', cleanArtist);
      if (duration) url.searchParams.set('duration', String(Math.round(duration)));

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) return data;
      }
    } catch {
      // Fallback to direct LRCLib if Verome is offline
    }

    // 2. Direct resilient fallback to LRCLib (free, zero API key required)
    try {
      let lrcUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
      if (duration) lrcUrl += `&duration=${Math.round(duration)}`;

      let response = await fetch(lrcUrl, {
        headers: { 'User-Agent': 'VibeSync/1.0 (https://vibe-sync-hazel.vercel.app)' },
        signal: AbortSignal.timeout(4000),
      });

      let data = await response.json();

      if (!data || data.statusCode === 404) {
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`)}`;
        response = await fetch(searchUrl, {
          headers: { 'User-Agent': 'VibeSync/1.0 (https://vibe-sync-hazel.vercel.app)' },
          signal: AbortSignal.timeout(4000),
        });
        const results = await response.json();
        if (Array.isArray(results) && results.length > 0) {
          data = results[0];
        }
      }

      if (!data || data.statusCode) {
        return { success: false, error: 'Lyrics not found' };
      }

      return {
        success: true,
        trackName: data.trackName,
        artistName: data.artistName,
        albumName: data.albumName,
        duration: data.duration,
        plainLyrics: data.plainLyrics,
        syncedLyrics: data.syncedLyrics,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Lyrics request failed' };
    }
  }

  /**
   * Trending music discovery (/api/trending)
   */
  async getTrending(country = 'United States'): Promise<NormalizedTrack[]> {
    try {
      const url = new URL(`${this.baseUrl}/api/trending`);
      url.searchParams.set('country', country);

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return [];
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : data.results || [];
      return rawList
        .map((item: VeromeSearchResultItem) => this.normalize(item))
        .filter((t: NormalizedTrack | null): t is NormalizedTrack => t !== null);
    } catch {
      return [];
    }
  }

  /**
   * Radio discovery mix (/api/radio?videoId=)
   */
  async getRadio(videoId: string): Promise<NormalizedTrack[]> {
    if (!videoId) return [];
    try {
      const url = new URL(`${this.baseUrl}/api/radio`);
      url.searchParams.set('videoId', videoId);

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return [];
      const data = await res.json();
      const tracks = Array.isArray(data.tracks) ? data.tracks : data.results || [];
      return tracks
        .map((item: VeromeSearchResultItem) => this.normalize(item))
        .filter((t: NormalizedTrack | null): t is NormalizedTrack => t !== null);
    } catch {
      return [];
    }
  }
}
