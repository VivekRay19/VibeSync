import { NextRequest, NextResponse } from 'next/server';
import { providerRegistry } from '@/lib/providers/provider-registry';
import { MusicProviderId } from '@/lib/types/music';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider') as MusicProviderId;
    const trackId = searchParams.get('trackId');

    if (!provider || !trackId) {
      return NextResponse.json({ error: 'Missing provider or trackId' }, { status: 400 });
    }

    const streamUrl = await providerRegistry.resolvePlayableSource(provider, trackId);
    if (!streamUrl) {
      return NextResponse.json(
        { error: 'Stream source could not be resolved from provider' },
        { status: 404 }
      );
    }

    return NextResponse.json({ streamUrl }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to resolve stream source', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
