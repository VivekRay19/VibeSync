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

const INNERTUBE_API_KEY = 'AIzaSyC9XL3ZjWjXClIX1FmUxJq--EohcD4_oSs';
const INNERTUBE_BASE_URL = 'https://music.youtube.com/youtubei/v1';
const INNERTUBE_CONTEXT = {
  client: {
    hl: 'en',
    gl: 'US',
    clientName: 'WEB_REMIX',
    clientVersion: '1.20251015.03.00',
    platform: 'DESKTOP',
    utcOffsetMinutes: 0,
  },
};

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
    // Both external Verome instance and built-in direct YouTube Music engine are operational
    return true;
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
    const artworkUrl =
      item.thumbnails?.[0]?.url || item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
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
      streamUrl: null, // Playback powered by official YouTube IFrame Player API
      playbackType: 'video_embed',
      restrictions: {
        embeddable: true,
      },
      attributionText: `Song "${title}" by ${artistName} on YouTube Music`,
      isPlayable: true,
    };
  }

  async searchTracks(query: string, _page = 1, limit = 20): Promise<SearchResult> {
    void _page;
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { tracks: [], provider: this.id, hasMore: false, total: 0 };
    }

    // 1. If an external or custom Verome API endpoint is reachable, query it
    try {
      const url = new URL(`${this.baseUrl}/api/search`);
      url.searchParams.set('q', cleanQuery);
      url.searchParams.set('filter', 'songs');

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data: VeromeSearchResponse = await res.json();
        const rawResults = data.results || [];
        const tracks: NormalizedTrack[] = rawResults
          .map((item) => this.normalize(item))
          .filter((t): t is NormalizedTrack => t !== null)
          .slice(0, limit);

        if (tracks.length > 0) {
          return {
            tracks,
            provider: this.id,
            hasMore: Boolean(data.continuationToken),
            total: tracks.length,
          };
        }
      }
    } catch {
      // Gracefully fall through to direct YouTube Music engine
    }

    // 2. Built-in resilient YouTube Music Innertube search engine (zero-config, always works)
    return await this.searchDirectInnertube(cleanQuery, limit);
  }

  /**
   * Built-in YouTube Music Innertube search engine
   */
  private async searchDirectInnertube(query: string, limit = 20): Promise<SearchResult> {
    try {
      const url = `${INNERTUBE_BASE_URL}/search?key=${INNERTUBE_API_KEY}`;
      const payload = {
        context: INNERTUBE_CONTEXT,
        query: query.normalize('NFC'),
        params: 'EgWKAQIIAWoKEAkQAxAEEAoQBQ%3D%3D', // 'songs' filter
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return { tracks: [], provider: this.id, hasMore: false, total: 0 };
      }

      const data = await res.json();
      const tracks: NormalizedTrack[] = [];

      // Check card / top result shelf
      const sections =
        data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
        [];

      for (const section of sections) {
        if (section.musicCardShelfRenderer) {
          const card = section.musicCardShelfRenderer;
          const title = card.title?.runs?.[0]?.text;
          const videoId =
            card.onTap?.watchEndpoint?.videoId ||
            card.buttons?.[0]?.buttonRenderer?.command?.watchEndpoint?.videoId;

          if (title && videoId) {
            const subtitleRuns = card.subtitle?.runs || [];
            const artistRun = subtitleRuns.find((r: { text?: string; navigationEndpoint?: unknown }) =>
              Boolean(r.navigationEndpoint)
            );
            const artistName = artistRun?.text || subtitleRuns[0]?.text || 'YouTube Music';
            const artworkUrl =
              card.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
              `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

            tracks.push({
              id: `verome:${videoId}`,
              provider: 'verome',
              providerTrackId: videoId,
              title,
              artistName,
              artworkUrl,
              durationSeconds: 0,
              providerPageUrl: `https://music.youtube.com/watch?v=${videoId}`,
              streamUrl: null,
              playbackType: 'video_embed',
              restrictions: { embeddable: true },
              attributionText: `Song "${title}" by ${artistName} on YouTube Music`,
              isPlayable: true,
            });
          }
        }

        if (section.musicShelfRenderer) {
          const contents = section.musicShelfRenderer.contents || [];
          for (const item of contents) {
            const renderer = item.musicResponsiveListItemRenderer;
            if (!renderer) continue;

            const title =
              renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
            const videoId =
              renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
                ?.playNavigationEndpoint?.watchEndpoint?.videoId;

            if (!title || !videoId) continue;

            const subtitleRuns =
              renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];

            const artistNames: string[] = [];
            let durationSeconds = 0;

            for (const r of subtitleRuns) {
              const text = r.text?.trim();
              if (!text || text === '•') continue;
              if (text.includes(':')) {
                durationSeconds = parseDurationSeconds(text);
              } else if (!artistNames.includes(text) && !text.toLowerCase().includes('views')) {
                artistNames.push(text);
              }
            }

            const artistName = artistNames.length > 0 ? artistNames.join(', ') : 'Unknown Artist';
            const artworkUrl =
              renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
              `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

            tracks.push({
              id: `verome:${videoId}`,
              provider: 'verome',
              providerTrackId: videoId,
              title,
              artistName,
              artworkUrl,
              durationSeconds,
              providerPageUrl: `https://music.youtube.com/watch?v=${videoId}`,
              streamUrl: null,
              playbackType: 'video_embed',
              restrictions: { embeddable: true },
              attributionText: `Song "${title}" by ${artistName} on YouTube Music`,
              isPlayable: true,
            });

            if (tracks.length >= limit) break;
          }
        }
      }

      return {
        tracks,
        provider: this.id,
        hasMore: false,
        total: tracks.length,
      };
    } catch {
      return {
        tracks: [],
        provider: this.id,
        hasMore: false,
        total: 0,
      };
    }
  }

  async getTrack(providerTrackId: string): Promise<NormalizedTrack | null> {
    if (!providerTrackId) return null;

    // 1. Try external Verome endpoint
    try {
      const url = `${this.baseUrl}/api/songs/${encodeURIComponent(providerTrackId)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        const norm = this.normalize(data);
        if (norm) return norm;
      }
    } catch {
      // Fall through to direct player endpoint
    }

    // 2. Direct YouTube Music player endpoint
    try {
      const url = `${INNERTUBE_BASE_URL}/player?key=${INNERTUBE_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: INNERTUBE_CONTEXT,
          videoId: providerTrackId,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const details = data?.videoDetails;
      if (!details) return null;

      return {
        id: `verome:${providerTrackId}`,
        provider: 'verome',
        providerTrackId,
        title: details.title || 'Unknown Title',
        artistName: details.author || 'Unknown Artist',
        artworkUrl:
          details.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          `https://i.ytimg.com/vi/${providerTrackId}/hqdefault.jpg`,
        durationSeconds: parseInt(details.lengthSeconds, 10) || 0,
        providerPageUrl: `https://music.youtube.com/watch?v=${providerTrackId}`,
        streamUrl: null,
        playbackType: 'video_embed',
        restrictions: { embeddable: true },
        attributionText: `Song "${details.title}" by ${details.author} on YouTube Music`,
        isPlayable: true,
      };
    } catch {
      return null;
    }
  }

  async getPlayableSource(providerTrackId: string): Promise<string | null> {
    return providerTrackId ? `https://www.youtube.com/watch?v=${providerTrackId}` : null;
  }

  getAttribution(track: NormalizedTrack): string {
    return track.attributionText || `Song "${track.title}" by ${track.artistName} on YouTube Music`;
  }

  getProviderPageUrl(track: NormalizedTrack): string {
    return track.providerPageUrl || `https://music.youtube.com/watch?v=${track.providerTrackId}`;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();

    // 1. Check local / configured Verome HTTP endpoint
    try {
      const url = `${this.baseUrl}/health`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2000),
      });

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        return {
          healthy: true,
          latencyMs,
          message: 'Verome API operational',
        };
      }
    } catch {
      // Local server is not running; check direct YouTube Music connection
    }

    // 2. Check direct YouTube Music connectivity
    try {
      const pingUrl = `${INNERTUBE_BASE_URL}/music/get_search_suggestions?key=${INNERTUBE_API_KEY}`;
      const pingRes = await fetch(pingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: INNERTUBE_CONTEXT, input: 'chill' }),
        signal: AbortSignal.timeout(3000),
      });

      const latencyMs = Date.now() - startTime;
      if (pingRes.ok) {
        return {
          healthy: true,
          latencyMs,
          message: 'YouTube Music operational (direct discovery)',
        };
      }
      return {
        healthy: false,
        latencyMs,
        message: `YouTube Music responded with status ${pingRes.status}`,
      };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        message: `YouTube Music unreachable: ${err instanceof Error ? err.message : 'Network failure'}`,
      };
    }
  }

  /**
   * Search suggestions helper (/api/search/suggestions?q=)
   */
  async getSearchSuggestions(query: string): Promise<string[]> {
    const clean = query.trim();
    if (!clean) return [];

    // 1. Try local Verome instance
    try {
      const url = new URL(`${this.baseUrl}/api/search/suggestions`);
      url.searchParams.set('q', clean);
      url.searchParams.set('music', '1');

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2000),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          return data.suggestions;
        }
      }
    } catch {
      // Fall through to direct Innertube suggestions
    }

    // 2. Direct Innertube suggestions
    try {
      const url = `${INNERTUBE_BASE_URL}/music/get_search_suggestions?key=${INNERTUBE_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: INNERTUBE_CONTEXT, input: clean.normalize('NFC') }),
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) return [];
      const data = await res.json();
      const contents = data?.contents?.[0]?.searchSuggestionsSectionRenderer?.contents || [];
      const suggestions: string[] = [];

      for (const item of contents) {
        const runs = item?.searchSuggestionRenderer?.suggestion?.runs || [];
        const text = runs.map((r: { text?: string }) => r.text).join('');
        if (text) suggestions.push(text);
      }

      return suggestions;
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

    // 1. Try local Verome instance
    try {
      const url = new URL(`${this.baseUrl}/api/lyrics`);
      url.searchParams.set('title', cleanTitle);
      url.searchParams.set('artist', cleanArtist);
      if (duration) url.searchParams.set('duration', String(Math.round(duration)));

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) return data;
      }
    } catch {
      // Fall through to direct LRCLib
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
}
