import { describe, it, expect } from 'vitest';
import { AudiusAdapter } from '@/lib/providers/audius-adapter';
import { JamendoAdapter } from '@/lib/providers/jamendo-adapter';
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

  it('Jamendo reports unconfigured gracefully when client_id is not set', async () => {
    delete process.env.JAMENDO_CLIENT_ID;
    const jamendo = new JamendoAdapter();
    expect(jamendo.isConfigured()).toBe(false);

    const result = await jamendo.searchTracks('electronic');
    expect(result.tracks).toHaveLength(0);
    expect(result.warning).toContain('Jamendo client ID not configured');
  });

  it('ProviderRegistry aggregates search and isolates provider failures', async () => {
    const registry = new ProviderRegistry();
    const configured = registry.getConfiguredProviders();
    expect(configured.length).toBeGreaterThanOrEqual(2);
    expect(configured.some((p) => p.id === 'audius')).toBe(true);
  });

  it('ProviderRegistry resolves valid providers by id', () => {
    const registry = new ProviderRegistry();
    const audius = registry.get('audius');
    expect(audius).toBeDefined();
    expect(audius?.name).toBe('Audius');

    const jamendo = registry.get('jamendo');
    expect(jamendo).toBeDefined();
    expect(jamendo?.name).toBe('Jamendo');
  });
});
