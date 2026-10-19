/**
 * In-memory Server-Sent Events (SSE) Room Broadcaster
 * Manages active HTTP streaming connections per room and fans out state events to all connected clients.
 */

type EventListener = (event: { type: string; payload: unknown }) => void;

// Global map to ensure room subscribers persist across hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var __vibesync_room_subscribers: Map<string, Set<EventListener>> | undefined;
  // eslint-disable-next-line no-var
  var __vibesync_room_presence: Map<string, Map<string, { userId: string; displayName: string; joinedAt: string }>> | undefined;
}

const subscribersMap: Map<string, Set<EventListener>> =
  globalThis.__vibesync_room_subscribers ?? new Map();
globalThis.__vibesync_room_subscribers = subscribersMap;

const presenceMap: Map<string, Map<string, { userId: string; displayName: string; joinedAt: string }>> =
  globalThis.__vibesync_room_presence ?? new Map();
globalThis.__vibesync_room_presence = presenceMap;

/**
 * Register an SSE connection listener for a room
 */
export function subscribeToRoom(
  roomId: string,
  listener: EventListener
): () => void {
  let roomSubs = subscribersMap.get(roomId);
  if (!roomSubs) {
    roomSubs = new Set();
    subscribersMap.set(roomId, roomSubs);
  }
  roomSubs.add(listener);

  return () => {
    const subs = subscribersMap.get(roomId);
    if (subs) {
      subs.delete(listener);
      if (subs.size === 0) {
        subscribersMap.delete(roomId);
      }
    }
  };
}

/**
 * Broadcast an event to all connected listeners in a room
 */
export function broadcastToRoom(roomId: string, type: string, payload: unknown): void {
  const roomSubs = subscribersMap.get(roomId);
  if (!roomSubs || roomSubs.size === 0) return;

  roomSubs.forEach((listener) => {
    try {
      listener({ type, payload });
    } catch (err) {
      console.error(`Error dispatching SSE to client in room ${roomId}:`, err);
    }
  });
}

/**
 * Track user presence in a room
 */
export function trackPresence(
  roomId: string,
  user: { userId: string; displayName: string }
): () => void {
  let roomPresence = presenceMap.get(roomId);
  if (!roomPresence) {
    roomPresence = new Map();
    presenceMap.set(roomId, roomPresence);
  }

  roomPresence.set(user.userId, {
    userId: user.userId,
    displayName: user.displayName,
    joinedAt: new Date().toISOString(),
  });

  // Broadcast updated presence list
  broadcastPresence(roomId);

  return () => {
    const current = presenceMap.get(roomId);
    if (current) {
      current.delete(user.userId);
      if (current.size === 0) {
        presenceMap.delete(roomId);
      }
    }
    broadcastPresence(roomId);
  };
}

export function getRoomPresence(roomId: string) {
  const current = presenceMap.get(roomId);
  if (!current) return [];
  return Array.from(current.values());
}

function broadcastPresence(roomId: string) {
  const activeMembers = getRoomPresence(roomId);
  broadcastToRoom(roomId, 'PRESENCE_SYNC', { members: activeMembers });
}

/**
 * Return total connected clients for a room
 */
export function getRoomSubscriberCount(roomId: string): number {
  return subscribersMap.get(roomId)?.size ?? 0;
}
