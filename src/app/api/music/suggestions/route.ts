import { NextRequest, NextResponse } from 'next/server';
import { providerRegistry } from '@/lib/providers/provider-registry';
import { VeromeAdapter } from '@/lib/providers/verome-adapter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('query') || searchParams.get('q') || '').trim();

    if (!query) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    const verome = providerRegistry.get('verome') as VeromeAdapter | undefined;
    if (verome && typeof verome.getSearchSuggestions === 'function') {
      const suggestions = await verome.getSearchSuggestions(query);
      if (suggestions.length > 0) {
        return NextResponse.json({ suggestions }, { status: 200 });
      }
    }

    // Direct fallback to Google/YouTube suggestion completion if Verome local service is offline
    try {
      const fallbackUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
      const res = await fetch(fallbackUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2500),
      });

      if (res.ok) {
        const data = await res.json();
        // Firefox format returns [query, [suggestions]]
        if (Array.isArray(data) && Array.isArray(data[1])) {
          return NextResponse.json({ suggestions: data[1].slice(0, 8) }, { status: 200 });
        }
      }
    } catch {
      // Ignore fallback errors
    }

    return NextResponse.json({ suggestions: [] }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to retrieve suggestions', message: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
