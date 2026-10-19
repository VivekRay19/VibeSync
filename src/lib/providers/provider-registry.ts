import { MusicProvider } from './provider-interface';
import { AudiusAdapter } from './audius-adapter';
import { YouTubeAdapter } from './youtube-adapter';
import { MusicProviderId, NormalizedTrack, SearchResult } from '../types/music';

export class ProviderRegistry {
  private providers: Map<MusicProviderId, MusicProvider> = new Map();

  constructor() {
    this.register(new AudiusAdapter());
    this.register(new YouTubeAdapter());
  }

  register(provider: MusicProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: MusicProviderId): MusicProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): MusicProvider[] {
    return Array.from(this.providers.values());
  }

  getConfiguredProviders(): { id: MusicProviderId; name: string; isConfigured: boolean }[] {
    return this.getAll().map((p) => ({
      id: p.id,
      name: p.name,
      isConfigured: p.isConfigured(),
    }));
  }

  async search(
    query: string,
    targetProvider: MusicProviderId | 'all' = 'all',
    page = 1,
    limit = 20
  ): Promise<{ tracks: NormalizedTrack[]; warnings: string[]; total: number }> {
    const activeProviders =
      targetProvider === 'all'
        ? this.getAll().filter((p) => p.isConfigured())
        : [this.get(targetProvider)].filter(Boolean) as MusicProvider[];

    const searchPromises = activeProviders.map(async (p) => {
      try {
        const perProviderLimit = targetProvider === 'all' ? Math.ceil(limit / activeProviders.length) : limit;
        return await p.searchTracks(query, page, perProviderLimit);
      } catch (err) {
        return {
          tracks: [],
          provider: p.id,
          hasMore: false,
          warning: `${p.name} search failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        } as SearchResult;
      }
    });

    const results = await Promise.allSettled(searchPromises);
    const combinedTracks: NormalizedTrack[] = [];
    const warnings: string[] = [];

    for (const res of results) {
      if (res.status === 'fulfilled') {
        combinedTracks.push(...res.value.tracks);
        if (res.value.warning) {
          warnings.push(res.value.warning);
        }
      } else {
        warnings.push(`Search provider failed unexpectedly: ${res.reason}`);
      }
    }

    return {
      tracks: combinedTracks,
      warnings,
      total: combinedTracks.length,
    };
  }

  async resolvePlayableSource(providerId: MusicProviderId, providerTrackId: string): Promise<string | null> {
    const provider = this.get(providerId);
    if (!provider) return null;
    return provider.getPlayableSource(providerTrackId);
  }

  async getTrack(providerId: MusicProviderId, providerTrackId: string): Promise<NormalizedTrack | null> {
    const provider = this.get(providerId);
    if (!provider) return null;
    return provider.getTrack(providerTrackId);
  }
}

// Global singleton instance
export const providerRegistry = new ProviderRegistry();
