import { Room, RoomMember, PlaybackState, QueueItem, NormalizedTrack } from '@/lib/types/music';

// In-memory test store used for fast unit simulation testing of state transitions
export class MemoryStore {
  rooms: Map<string, Room> = new Map();
  members: Map<string, RoomMember[]> = new Map();
  playback: Map<string, PlaybackState> = new Map();
  queues: Map<string, QueueItem[]> = new Map();

  private defaultTrack: NormalizedTrack = {
    id: 'audius:Y96Ry',
    provider: 'audius',
    providerTrackId: 'Y96Ry',
    title: 'Picnic Electronic Music',
    artistName: 'Guido Santiago',
    artworkUrl: 'https://audius-creator-1.theblueprint.xyz/content/QmUJVrqfL8t2hCSBBTNFtXg59qPuJsaYp59NK6HfTow8Wb/480x480.jpg',
    durationSeconds: 320,
    providerPageUrl: 'https://audius.co/track/Y96Ry',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/Y96Ry/stream?app_name=VIBESYNC',
    attributionText: 'Provided by Guido Santiago on Audius',
    isPlayable: true,
  };

  createRoom(name: string, ownerId: string, ownerName: string, roomCode?: string): { room: Room; state: PlaybackState } {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `room_${Math.random().toString(36).substring(2, 9)}`;
    const code = roomCode || this.generateRoomCode();
    const now = new Date().toISOString();

    const room: Room = {
      id,
      roomCode: code,
      name,
      ownerId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const ownerMember: RoomMember = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mem_${Math.random().toString(36).substring(2, 9)}`,
      roomId: id,
      userId: ownerId,
      displayName: ownerName,
      role: 'owner',
      joinedAt: now,
    };

    const state: PlaybackState = {
      roomId: id,
      provider: 'audius',
      providerTrackId: this.defaultTrack.providerTrackId,
      track: this.defaultTrack,
      playbackStatus: 'paused',
      basePositionSeconds: 0,
      updatedAtServer: now,
      revision: 1,
      updatedBy: ownerId,
      updatedByName: ownerName,
      currentQueueItemId: null,
    };

    this.rooms.set(id, room);
    this.rooms.set(code, room);
    this.members.set(id, [ownerMember]);
    this.playback.set(id, state);
    this.queues.set(id, []);

    return { room, state };
  }

  getRoomByCode(code: string): Room | null {
    return this.rooms.get(code.toUpperCase()) || null;
  }

  getRoomById(id: string): Room | null {
    return this.rooms.get(id) || null;
  }

  getPlaybackState(roomId: string): PlaybackState | null {
    return this.playback.get(roomId) || null;
  }

  getMembers(roomId: string): RoomMember[] {
    return this.members.get(roomId) || [];
  }

  addMember(roomId: string, userId: string, displayName: string): RoomMember {
    const list = this.members.get(roomId) || [];
    const existing = list.find((m) => m.userId === userId);
    if (existing) {
      existing.displayName = displayName;
      return existing;
    }

    const member: RoomMember = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mem_${Math.random().toString(36).substring(2, 9)}`,
      roomId,
      userId,
      displayName,
      role: 'member',
      joinedAt: new Date().toISOString(),
    };

    list.push(member);
    this.members.set(roomId, list);
    return member;
  }

  removeMember(roomId: string, userId: string): void {
    const list = this.members.get(roomId) || [];
    this.members.set(
      roomId,
      list.filter((m) => m.userId !== userId)
    );
  }

  updatePlayback(roomId: string, updates: Partial<PlaybackState>): PlaybackState | null {
    const current = this.playback.get(roomId);
    if (!current) return null;

    const nextState: PlaybackState = {
      ...current,
      ...updates,
      revision: (current.revision || 0) + 1,
      updatedAtServer: new Date().toISOString(),
    };

    this.playback.set(roomId, nextState);
    return nextState;
  }

  getQueue(roomId: string): QueueItem[] {
    return this.queues.get(roomId) || [];
  }

  addQueueItem(roomId: string, track: NormalizedTrack, userId: string, userName: string): QueueItem {
    const list = this.queues.get(roomId) || [];
    const item: QueueItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `qi_${Math.random().toString(36).substring(2, 9)}`,
      roomId,
      track,
      addedByUserId: userId,
      addedByName: userName,
      queuePosition: list.length,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    list.push(item);
    this.queues.set(roomId, list);
    return item;
  }

  removeQueueItem(roomId: string, itemId: string): QueueItem[] {
    const list = this.queues.get(roomId) || [];
    const updated = list.filter((i) => i.id !== itemId);
    this.queues.set(roomId, updated);
    return updated;
  }

  advanceQueue(roomId: string): { nextItem: QueueItem | null; remainingQueue: QueueItem[] } {
    const list = this.queues.get(roomId) || [];
    if (list.length === 0) {
      return { nextItem: null, remainingQueue: [] };
    }

    const [nextItem, ...remaining] = list;
    this.queues.set(roomId, remaining);
    return { nextItem, remainingQueue: remaining };
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export const memoryStore = new MemoryStore();
