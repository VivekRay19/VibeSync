import { NextRequest, NextResponse } from 'next/server';
import { getPlaybackState, getQueue } from '@/lib/neon/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const sinceRevision = searchParams.get('sinceRevision');

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId query parameter' }, { status: 400 });
    }

    const playbackState = await getPlaybackState(roomId);
    if (!playbackState) {
      return NextResponse.json({ error: 'Playback state not found' }, { status: 404 });
    }

    const serverTimestamp = Date.now();
    const clientRev = sinceRevision ? parseInt(sinceRevision, 10) : -1;

    // Fast path: client already has the latest authoritative state revision
    if (clientRev >= 0 && playbackState.revision <= clientRev) {
      return NextResponse.json(
        {
          modified: false,
          revision: playbackState.revision,
          playbackStatus: playbackState.playbackStatus,
          scheduledAt: playbackState.scheduledAt,
          serverTimestamp,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // State has advanced or first fetch: return latest state & queue
    const queue = await getQueue(roomId);

    return NextResponse.json(
      {
        modified: true,
        playbackState,
        queue,
        serverTimestamp,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('Room sync endpoint error:', err);
    return NextResponse.json(
      { error: 'Sync failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
