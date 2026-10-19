import { NextRequest } from 'next/server';
import { subscribeToRoom, trackPresence } from '@/lib/realtime/broadcast';
import { getAuthenticatedUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return new Response(JSON.stringify({ error: 'Missing roomId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Attempt to resolve user identity from signed session cookie or query params
  const sessionUser = getAuthenticatedUser();
  const queryUserId = searchParams.get('userId');
  const queryDisplayName = searchParams.get('displayName');

  const userId = sessionUser?.userId || queryUserId || `guest_${Math.random().toString(36).substring(2, 9)}`;
  const displayName = sessionUser?.displayName || queryDisplayName || 'Listener';

  const encoder = new TextEncoder();

  // Create stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection acknowledgement
      const welcomeData = JSON.stringify({
        type: 'CONNECTED',
        payload: { roomId, userId, timestamp: Date.now() },
      });
      controller.enqueue(encoder.encode(`data: ${welcomeData}\n\n`));

      // Subscribe to real-time events for this room
      const unsubscribe = subscribeToRoom(roomId, (event) => {
        try {
          const payloadStr = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${payloadStr}\n\n`));
        } catch (err) {
          console.error(`Failed to push SSE event in room ${roomId}:`, err);
        }
      });

      // Track participant presence
      const untrackPresence = trackPresence(roomId, { userId, displayName });

      // Keepalive heartbeat every 20 seconds to prevent network timeouts
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20000);

      // Cleanup when client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        untrackPresence();
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
