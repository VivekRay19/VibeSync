import { MusicProvider, ProviderHealth } from './provider-interface';
import { NormalizedTrack, SearchResult } from '../types/music';

interface AudiusTrackResponse {
  id: string;
  title: string;
  duration: number;
  user?: {
    name: string;
    handle: string;
  };
  artwork?: {
    '150x150'?: string;
    '480x480'?: string;
    '1000x1000'?: string;
  };
  permalink?: string;
  is_streamable?: boolean;
  genre?: string;
  tags?: string;
}

export class AudiusAdapter implements MusicProvider {
  readonly id = 'audius' as const;
  readonly name = 'Audius';
  readonly playbackType = 'audio_stream' as const;

  private defaultHost = 'https://discoveryprovider.audius.co';
  private appName = 'VibeSync';
  private cachedHost: string | null = null;
  private lastHostCheck = 0;

  private async getHealthyHost(): Promise<string> {
    const now = Date.now();
    // Re-check host every 15 minutes
    if (this.cachedHost && now - this.lastHostCheck < 15 * 60 * 1000) {
      return this.cachedHost;
    }

    try {
      const res = await fetch('https://api.audius.co', {
        next: { revalidate: 900 },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) {
          this.cachedHost = data.data[0];
          this.lastHostCheck = now;
          return this.cachedHost!;
        }
      }
    } catch {
      // Fallback to defaultHost
    }

    this.cachedHost = this.defaultHost;
    this.lastHostCheck = now;
    return this.defaultHost;
  }

  private getApiKey(): string | undefined {
    return process.env.AUDIUS_API_KEY;
  }

  private buildUrl(host: string, path: string, params: Record<string, string | number> = {}): string {
    const url = new URL(path, host);
    url.searchParams.set('app_name', this.appName);
    const apiKey = this.getApiKey();
    if (apiKey) {
      url.searchParams.set('api_key', apiKey);
    }
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  isConfigured(): boolean {
    // Audius provides public decentralised access by default without a mandatory paid key
    return true;
  }

  private normalize(raw: AudiusTrackResponse): NormalizedTrack {
    const artworkUrl =
      raw.artwork?.['480x480'] ||
      raw.artwork?.['1000x1000'] ||
      raw.artwork?.['150x150'] ||
      null;

    const userHandle = raw.user?.handle || 'audius';
    const providerPageUrl = raw.permalink
      ? `https://audius.co${raw.permalink}`
      : `https://audius.co/track/${raw.id}`;

    return {
      id: `audius:${raw.id}`,
      provider: 'audius',
      providerTrackId: raw.id,
      title: raw.title || 'Untitled Track',
      artistName: raw.user?.name || 'Unknown Artist',
      artworkUrl,
      durationSeconds: Math.max(0, Math.round(raw.duration || 0)),
      providerPageUrl,
      streamUrl: this.getDirectStreamUrl(raw.id),
      playbackType: 'audio_stream',
      restrictions: {
        embeddable: true,
      },
      attributionText: `Provided by ${raw.user?.name || 'Audius Creator'} on Audius`,
      licenseUrl: 'https://audius.co/terms-of-use',
      isPlayable: raw.is_streamable !== false,
      userHandle,
      tags: raw.tags ? raw.tags.split(',').map((t) => t.trim()) : undefined,
    };
  }

  public getDirectStreamUrl(trackId: string): string {
    const host = this.cachedHost || this.defaultHost;
    return this.buildUrl(host, `/v1/tracks/${trackId}/stream`);
  }

  async searchTracks(query: string, page = 1, limit = 20): Promise<SearchResult> {
    if (!query || query.trim().length === 0) {
      return { tracks: [], provider: this.id, hasMore: false, total: 0 };
    }

    try {
      const host = await this.getHealthyHost();
      const offset = (page - 1) * limit;
      const url = this.buildUrl(host, '/v1/tracks/search', {
        query: query.trim(),
        limit,
        offset,
      });

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        if (res.status === 429) {
          return {
            tracks: [],
            provider: this.id,
            hasMore: false,
            warning: 'Audius API rate limit reached. Please wait a moment and try again.',
          };
        }
        return {
          tracks: [],
          provider: this.id,
          hasMore: false,
          warning: `Audius search failed with status ${res.status}`,
        };
      }

      const data = await res.json();
      const rawTracks: AudiusTrackResponse[] = Array.isArray(data.data) ? data.data : [];
      const tracks = rawTracks.map((t) => this.normalize(t));

      return {
        tracks,
        provider: this.id,
        hasMore: rawTracks.length === limit,
        total: tracks.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown network error';
      return {
        tracks: [],
        provider: this.id,
        hasMore: false,
        warning: `Could not reach Audius: ${message}`,
      };
    }
  }

  async getTrack(providerTrackId: string): Promise<NormalizedTrack | null> {
    try {
      const host = await this.getHealthyHost();
      const url = this.buildUrl(host, `/v1/tracks/${providerTrackId}`);

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (!data.data) return null;

      return this.normalize(data.data);
    } catch {
      return null;
    }
  }

  async getPlayableSource(providerTrackId: string): Promise<string | null> {
    const host = await this.getHealthyHost();
    return this.buildUrl(host, `/v1/tracks/${providerTrackId}/stream`);
  }

  getAttribution(track: NormalizedTrack): string {
    return track.attributionText || `Provided by ${track.artistName} via Audius`;
  }

  getProviderPageUrl(track: NormalizedTrack): string {
    return track.providerPageUrl;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const host = await this.getHealthyHost();
      const latencyMs = Date.now() - startTime;
      return {
        healthy: true,
        latencyMs,
        message: `Audius gateway node active (${host})`,
      };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        message: `Audius health check failed: ${err instanceof Error ? err.message : 'Unreachable'}`,
      };
    }
  }
}
