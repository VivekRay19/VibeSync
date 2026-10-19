import { describe, it, expect } from 'vitest';
import { AudiusAdapter } from '@/lib/providers/audius-adapter';
import { YouTubeAdapter } from '@/lib/providers/youtube-adapter';
import { ProviderRegistry } from '@/lib/providers/provider-registry';

describe('Music Providers', () => {
  it('Audius adapter is configured by default', () => {
    const audius = new AudiusAdapter();
    expect(audius.id).toBe('audius');
    expect(audius.name).toBe('Audius');
    expect(audius.isConfigured()).toBe(true);
  });

  it('Audius generates direct stream URLs properly', () => {
    const audius = new AudiusAdapter();
    const streamUrl = audius.getDirectStreamUrl('track-123');
    expect(streamUrl).toContain('/v1/tracks/track-123/stream');
    expect(streamUrl).toContain('app_name=VibeSync');
  });

  it('YouTube adapter identifies properly and generates canonical URLs', async () => {
    const yt = new YouTubeAdapter();
    expect(yt.id).toBe('youtube');
    expect(yt.name).toBe('YouTube');

    const source = await yt.getPlayableSource('dQw4w9WgXcQ');
    expect(source).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('YouTube adapter handles unconfigured state gracefully', async () => {
    const originalKey = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;

    const unconfiguredYt = new YouTubeAdapter();
    expect(unconfiguredYt.isConfigured()).toBe(false);

    const result = await unconfiguredYt.searchTracks('Justin Bieber');
    expect(result.tracks).toHaveLength(0);
    expect(result.warning).toContain('YouTube API key not configured');

    process.env.YOUTUBE_API_KEY = originalKey;
  });

  it('YouTube adapter searches and returns genuine tracks when configured', async () => {
    if (!process.env.YOUTUBE_API_KEY) {
      // Skip live fetch if key is absent
      return;
    }

    const yt = new YouTubeAdapter();
    expect(yt.isConfigured()).toBe(true);

    const result = await yt.searchTracks('Ghost Justin Bieber', 1, 3);
    expect(result.tracks.length).toBeGreaterThan(0);
    expect(result.tracks[0].provider).toBe('youtube');
    expect(result.tracks[0].providerTrackId).toBeDefined();
    expect(result.tracks[0].providerPageUrl).toContain('youtube.com/watch?v=');
  });

  it('ProviderRegistry registers and resolves both Audius and YouTube', () => {
    const registry = new ProviderRegistry();
    const audius = registry.get('audius');
    expect(audius).toBeDefined();
    expect(audius?.name).toBe('Audius');

    const youtube = registry.get('youtube');
    expect(youtube).toBeDefined();
    expect(youtube?.name).toBe('YouTube');

    const configured = registry.getConfiguredProviders();
    expect(configured.some((p) => p.id === 'audius')).toBe(true);
    expect(configured.some((p) => p.id === 'youtube')).toBe(true);
  });
});
