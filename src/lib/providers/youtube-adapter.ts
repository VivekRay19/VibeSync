import { MusicProvider, ProviderHealth } from './provider-interface';
import { NormalizedTrack, SearchResult } from '../types/music';

interface YouTubeSnippetThumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface YouTubeSearchItem {
  id: {
    kind: string;
    videoId: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default?: YouTubeSnippetThumbnail;
      medium?: YouTubeSnippetThumbnail;
      high?: YouTubeSnippetThumbnail;
    };
    channelTitle: string;
    liveBroadcastContent?: string;
  };
}

interface YouTubeSearchApiResponse {
  items?: YouTubeSearchItem[];
  pageInfo?: {
    totalResults: number;
    resultsPerPage: number;
  };
  error?: {
    code: number;
    message: string;
    errors?: Array<{ message: string; reason: string }>;
  };
}

// In-memory cache to conserve YouTube Data API quota (100 units per search request)
interface CacheEntry {
  timestamp: number;
  data: SearchResult;
}
const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Utility to decode HTML entities returned by YouTube API (e.g. &amp;, &#39;, &quot;)
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&nbsp;/g, ' ');
}

export class YouTubeAdapter implements MusicProvider {
  readonly id = 'youtube' as const;
  readonly name = 'YouTube';
  readonly playbackType = 'video_embed' as const;

  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || null;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.includes('placeholder'));
  }

  private normalize(item: YouTubeSearchItem): NormalizedTrack | null {
    const videoId = item.id?.videoId;
    if (!videoId) return null;

    const title = decodeHtmlEntities(item.snippet?.title || 'Unknown Title');
    const artistName = decodeHtmlEntities(item.snippet?.channelTitle || 'YouTube Creator');
    const artworkUrl =
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      null;

    return {
      id: `youtube:${videoId}`,
      provider: 'youtube',
      providerTrackId: videoId,
      title,
      artistName,
      artworkUrl,
      durationSeconds: 0, // YouTube IFrame Player API reports true runtime dynamically upon playback
      providerPageUrl: `https://www.youtube.com/watch?v=${videoId}`,
      streamUrl: null, // Audio extraction is strictly prohibited; playback uses official embedded IFrame
      playbackType: 'video_embed',
      restrictions: {
        embeddable: true,
      },
      attributionText: `Video "${title}" by ${artistName} on YouTube`,
      isPlayable: true,
    };
  }

  async searchTracks(query: string, page = 1, limit = 20): Promise<SearchResult> {
    if (!this.isConfigured()) {
      return {
        tracks: [],
        provider: this.id,
        hasMore: false,
        total: 0,
        warning: 'YouTube API key not configured. Set YOUTUBE_API_KEY in your environment to enable YouTube search.',
      };
    }

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { tracks: [], provider: this.id, hasMore: false, total: 0 };
    }

    // Check memory cache to protect quota
    const cacheKey = `${cleanQuery.toLowerCase()}:${page}:${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('type', 'video');
      url.searchParams.set('videoEmbeddable', 'true'); // Filter to embeddable videos
      url.searchParams.set('maxResults', String(Math.min(Math.max(limit, 1), 50)));
      url.searchParams.set('q', cleanQuery);
      url.searchParams.set('key', this.apiKey!);

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        next: { revalidate: 300 },
      });

      if (!res.ok) {
        const errorData: YouTubeSearchApiResponse = await res.json().catch(() => ({}));
        const reason = errorData.error?.errors?.[0]?.reason || '';

        if (res.status === 403 && (reason === 'quotaExceeded' || reason === 'rateLimitExceeded')) {
          return {
            tracks: [],
            provider: this.id,
            hasMore: false,
            warning: 'YouTube API search quota has been reached for today. Search will resume once quota resets.',
          };
        }

        if (res.status === 400 || res.status === 403) {
          return {
            tracks: [],
            provider: this.id,
            hasMore: false,
            warning: `YouTube search error: ${errorData.error?.message || 'Access restricted'}`,
          };
        }

        throw new Error(`YouTube API returned status ${res.status}`);
      }

      const data: YouTubeSearchApiResponse = await res.json();
      const rawItems = data.items || [];
      const tracks: NormalizedTrack[] = rawItems
        .map((item) => this.normalize(item))
        .filter((t): t is NormalizedTrack => t !== null);

      const result: SearchResult = {
        tracks,
        provider: this.id,
        hasMore: false,
        total: data.pageInfo?.totalResults ?? tracks.length,
      };

      // Store in memory cache
      searchCache.set(cacheKey, { timestamp: Date.now(), data: result });

      return result;
    } catch (err) {
      console.error('YouTube search exception:', err);
      return {
        tracks: [],
        provider: this.id,
        hasMore: false,
        warning: `Could not reach YouTube API: ${err instanceof Error ? err.message : 'Network error'}`,
      };
    }
  }

  async getTrack(providerTrackId: string): Promise<NormalizedTrack | null> {
    if (!this.isConfigured() || !providerTrackId) return null;

    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('id', providerTrackId);
      url.searchParams.set('key', this.apiKey!);

      const res = await fetch(url.toString());
      if (!res.ok) return null;

      const data = await res.json();
      const item = data.items?.[0];
      if (!item) return null;

      return this.normalize({
        id: { kind: 'youtube#video', videoId: providerTrackId },
        snippet: item.snippet,
      });
    } catch {
      return null;
    }
  }

  async getPlayableSource(providerTrackId: string): Promise<string | null> {
    // YouTube playback does not use raw audio source URLs; it uses video IDs for embedded IFrame Player
    return providerTrackId ? `https://www.youtube.com/watch?v=${providerTrackId}` : null;
  }

  getAttribution(track: NormalizedTrack): string {
    return track.attributionText || `Video "${track.title}" by ${track.artistName} on YouTube`;
  }

  getProviderPageUrl(track: NormalizedTrack): string {
    return track.providerPageUrl || `https://www.youtube.com/watch?v=${track.providerTrackId}`;
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.isConfigured()) {
      return {
        healthy: false,
        message: 'YouTube API key not configured',
      };
    }

    const startTime = Date.now();
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('id', 'KRUWn3dLoRg');
      url.searchParams.set('key', this.apiKey!);

      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        return {
          healthy: true,
          latencyMs,
          message: 'YouTube Data API v3 operational',
        };
      }
      return {
        healthy: false,
        latencyMs,
        message: `YouTube Data API returned status ${res.status}`,
      };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        message: `YouTube connectivity error: ${err instanceof Error ? err.message : 'Unreachable'}`,
      };
    }
  }
}
