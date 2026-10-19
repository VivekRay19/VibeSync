import { MusicProviderId, NormalizedTrack, SearchResult } from '../types/music';

export interface MusicProvider {
  readonly id: MusicProviderId;
  readonly name: string;

  /**
   * Check if the provider has all required credentials or public connectivity configured.
   */
  isConfigured(): boolean;

  /**
   * Search for tracks matching a user query with optional pagination.
   */
  searchTracks(query: string, page?: number, limit?: number): Promise<SearchResult>;

  /**
   * Fetch single track details by its provider-specific ID.
   */
  getTrack(providerTrackId: string): Promise<NormalizedTrack | null>;

  /**
   * Resolve an authorized streaming audio URL for direct browser playback.
   */
  getPlayableSource(providerTrackId: string): Promise<string | null>;

  /**
   * Return human-readable attribution / licensing notice for compliance.
   */
  getAttribution(track: NormalizedTrack): string;

  /**
   * Return the canonical external page on the provider's platform.
   */
  getProviderPageUrl(track: NormalizedTrack): string;
}
