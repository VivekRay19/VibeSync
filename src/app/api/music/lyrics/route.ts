import { NextRequest, NextResponse } from 'next/server';
import { providerRegistry } from '@/lib/providers/provider-registry';
import { VeromeAdapter } from '@/lib/providers/verome-adapter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = (searchParams.get('title') || '').trim();
    const artist = (searchParams.get('artist') || '').trim();
    const duration = searchParams.get('duration') ? parseFloat(searchParams.get('duration')!) : undefined;

    if (!title || !artist) {
      return NextResponse.json(
        { success: false, error: 'Query parameters "title" and "artist" are required' },
        { status: 400 }
      );
    }

    const verome = providerRegistry.get('verome') as VeromeAdapter | undefined;
    if (verome && typeof verome.getLyrics === 'function') {
      const lyrics = await verome.getLyrics(title, artist, duration);
      return NextResponse.json(lyrics, { status: lyrics.success ? 200 : 404 });
    }

    return NextResponse.json({ success: false, error: 'Lyrics service unavailable' }, { status: 503 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
