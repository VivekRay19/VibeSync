import { MusicProvider } from './provider-interface';
import { NormalizedTrack, SearchResult } from '../types/music';

interface JamendoTrackItem {
  id: string;
  name: string;
  duration: number;
  artist_name: string;
  artist_id?: string;
  album_name?: string;
  image?: string;
  audio?: string;
  audiodl?: string;
  shareurl?: string;
  license_ccurl?: string;
}

interface JamendoApiResponse {
  headers: {
    status: string;
    code: number;
    error_message?: string;
    results_count: number;
  };
  results: JamendoTrackItem[];
}

export class JamendoAdapter implements MusicProvider {
  readonly id = 'jamendo' as const;
  readonly name = 'Jamendo';

  private clientId: string | null = null;

  constructor() {
    this.clientId = process.env.JAMENDO_CLIENT_ID || null;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientId.trim().length > 0);
  }

  private normalize(raw: JamendoTrackItem): NormalizedTrack {
    return {
      id: `jamendo:${raw.id}`,
      provider: 'jamendo',
      providerTrackId: String(raw.id),
      title: raw.name || 'Untitled Track',
      artistName: raw.artist_name || 'Unknown Artist',
      artworkUrl: raw.image || null,
      durationSeconds: Math.max(0, Math.round(raw.duration || 0)),
      providerPageUrl: raw.shareurl || `https://www.jamendo.com/track/${raw.id}`,
      streamUrl: raw.audio || null,
      attributionText: `Track "${raw.name}" by ${raw.artist_name} (Licensed under Jamendo / Creative Commons)`,
      licenseUrl: raw.license_ccurl || 'https://www.jamendo.com/legal/licenses',
      isPlayable: Boolean(raw.audio),
    };
  }

  async searchTracks(query: string, page = 1, limit = 20): Promise<SearchResult> {
    if (!this.isConfigured()) {
      return {
        tracks: [],
        provider: this.id,
        hasMore: false,
        total: 0,
        warning: 'Jamendo client ID not configured. Set JAMENDO_CLIENT_ID in your environment to enable Jamendo catalog search.',
      };
    }

    if (!query || query.trim().length === 0) {
      return { tracks: [], provider: this.id, hasMore: false, total: 0 };
    }

    try {
      const offset = (page - 1) * limit;
      const url = new URL('https://api.jamendo.com/v3.0/tracks/');
      url.searchParams.set('client_id', this.clientId!);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('namesearch', query.trim());
      url.searchParams.set('include', 'musicinfo');
      url.searchParams.set('audioformat', 'mp32');

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        return {
          tracks: [],
          provider: this.id,
          hasMore: false,
          warning: `Jamendo search failed with HTTP status ${res.status}`,
        };
      }

      const data: JamendoApiResponse = await res.json();
      if (data.headers.status === 'failed') {
        return {
          tracks: [],
          provider: this.id,
          hasMore: false,
          warning: data.headers.error_message || 'Jamendo API request failed',
        };
      }

      const rawTracks = data.results || [];
      const tracks = rawTracks.map((t) => this.normalize(t));

      return {
        tracks,
        provider: this.id,
        hasMore: rawTracks.length === limit,
        total: tracks.length,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return {
        tracks: [],
        provider: this.id,
        hasMore: false,
        warning: `Could not reach Jamendo: ${msg}`,
      };
    }
  }

  async getTrack(providerTrackId: string): Promise<NormalizedTrack | null> {
    if (!this.isConfigured()) return null;

    try {
      const url = new URL('https://api.jamendo.com/v3.0/tracks/');
      url.searchParams.set('client_id', this.clientId!);
      url.searchParams.set('format', 'json');
      url.searchParams.set('id', providerTrackId);
      url.searchParams.set('audioformat', 'mp32');

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return null;
      const data: JamendoApiResponse = await res.json();
      if (!data.results || data.results.length === 0) return null;

      return this.normalize(data.results[0]);
    } catch {
      return null;
    }
  }

  async getPlayableSource(providerTrackId: string): Promise<string | null> {
    const track = await this.getTrack(providerTrackId);
    return track?.streamUrl || null;
  }

  getAttribution(track: NormalizedTrack): string {
    return track.attributionText || `Provided by ${track.artistName} via Jamendo`;
  }

  getProviderPageUrl(track: NormalizedTrack): string {
    return track.providerPageUrl;
  }
}
