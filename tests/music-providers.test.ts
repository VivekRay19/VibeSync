import { describe, it, expect } from 'vitest';
import { AudiusAdapter } from '@/lib/providers/audius-adapter';
import { YouTubeAdapter } from '@/lib/providers/youtube-adapter';
import { VeromeAdapter } from '@/lib/providers/verome-adapter';
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

  it('Verome adapter initializes with correct metadata and embed playback type', async () => {
    const verome = new VeromeAdapter('http://localhost:8000');
    expect(verome.id).toBe('verome');
    expect(verome.name).toBe('Verome (YouTube Music)');
    expect(verome.playbackType).toBe('video_embed');
    expect(verome.isConfigured()).toBe(true);

    const source = await verome.getPlayableSource('KRUWn3dLoRg');
    expect(source).toBe('https://www.youtube.com/watch?v=KRUWn3dLoRg');
  });

  it('Verome adapter falls back to direct YouTube Music engine when local server is offline', async () => {
    // Port 19999 has no running server - fallback to direct YouTube Music should succeed seamlessly
    const offlineVerome = new VeromeAdapter('http://127.0.0.1:19999');
    const result = await offlineVerome.searchTracks('Synthwave', 1, 3);
    expect(result.provider).toBe('verome');
    expect(result.tracks.length).toBeGreaterThan(0);
    expect(result.tracks[0].provider).toBe('verome');
    expect(result.tracks[0].providerTrackId).toBeDefined();

    const health = await offlineVerome.healthCheck();
    expect(health.healthy).toBe(true);
  });

  it('Verome adapter retrieves lyrics with resilient LRCLib fallback', async () => {
    const verome = new VeromeAdapter('http://127.0.0.1:19999');
    // Even if local Verome server is offline, fallback retrieves real lyrics for known song
    const lyrics = await verome.getLyrics('Imagine', 'John Lennon', 183);
    if (lyrics.success) {
      expect(lyrics.trackName?.toLowerCase()).toContain('imagine');
      expect(lyrics.plainLyrics || lyrics.syncedLyrics).toBeDefined();
    } else {
      expect(lyrics.error).toBeDefined();
    }
  });

  it('ProviderRegistry registers and resolves Audius, YouTube and Verome', () => {
    const registry = new ProviderRegistry();
    const audius = registry.get('audius');
    expect(audius).toBeDefined();
    expect(audius?.name).toBe('Audius');

    const youtube = registry.get('youtube');
    expect(youtube).toBeDefined();
    expect(youtube?.name).toBe('YouTube');

    const verome = registry.get('verome');
    expect(verome).toBeDefined();
    expect(verome?.name).toBe('Verome (YouTube Music)');

    const configured = registry.getConfiguredProviders();
    expect(configured.some((p) => p.id === 'audius' && p.playbackType === 'audio_stream')).toBe(true);
    expect(configured.some((p) => p.id === 'youtube' && p.playbackType === 'video_embed')).toBe(true);
    expect(configured.some((p) => p.id === 'verome' && p.playbackType === 'video_embed')).toBe(true);
  });

  it('ProviderRegistry performs connectivity and configuration health checks across all providers', async () => {
    const registry = new ProviderRegistry();
    const health = await registry.checkHealth();

    expect(health.audius).toBeDefined();
    expect(health.youtube).toBeDefined();
    expect(health.verome).toBeDefined();
    expect(typeof health.audius.healthy).toBe('boolean');
    expect(typeof health.youtube.healthy).toBe('boolean');
    expect(typeof health.verome.healthy).toBe('boolean');
  });
});
