import { NextRequest, NextResponse } from 'next/server';
import { SearchTracksSchema } from '@/lib/validations/room-schema';
import { providerRegistry } from '@/lib/providers/provider-registry';
import { MusicProviderId } from '@/lib/types/music';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const provider = (searchParams.get('provider') || 'all') as 'all' | MusicProviderId;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const validation = SearchTracksSchema.safeParse({ query, provider, page, limit });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { query: validatedQuery, provider: validatedProvider, page: validPage, limit: validLimit } =
      validation.data;

    const results = await providerRegistry.search(validatedQuery, validatedProvider, validPage, validLimit);

    return NextResponse.json(results, { status: 200 });
  } catch (err) {
    console.error('Search API error:', err);
    return NextResponse.json(
      { error: 'Failed to search music catalog', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
