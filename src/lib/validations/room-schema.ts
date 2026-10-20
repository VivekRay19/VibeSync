import { z } from 'zod';

export const CreateRoomSchema = z.object({
  name: z.string().trim().min(2, 'Room name must be at least 2 characters').max(50, 'Room name cannot exceed 50 characters'),
  displayName: z.string().trim().min(1, 'Display name is required').max(30, 'Display name cannot exceed 30 characters'),
});

export const JoinRoomSchema = z.object({
  roomCode: z.string().trim().min(4, 'Room code is too short').max(12, 'Room code is too long').toUpperCase(),
  displayName: z.string().trim().min(1, 'Display name is required').max(30, 'Display name cannot exceed 30 characters'),
});

export const SearchTracksSchema = z.object({
  query: z.string().trim().min(1, 'Search query cannot be empty').max(100, 'Search query is too long'),
  provider: z.enum(['all', 'audius', 'youtube', 'verome']).default('verome'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const TrackSchema = z.object({
  id: z.string(),
  provider: z.enum(['audius', 'youtube', 'verome']),
  providerTrackId: z.string(),
  title: z.string(),
  artistName: z.string(),
  artworkUrl: z.string().nullable().optional(),
  durationSeconds: z.number().nonnegative(),
  providerPageUrl: z.string(),
  streamUrl: z.string().nullable().optional(),
  licenseUrl: z.string().nullable().optional(),
  attributionText: z.string().nullable().optional(),
  isPlayable: z.boolean(),
  userHandle: z.string().optional(),
});

export const PlaybackCommandSchema = z.object({
  commandId: z.string().optional(),
  roomId: z.string().uuid('Invalid room ID'),
  command: z.enum(['PLAY', 'PAUSE', 'RESUME', 'SEEK', 'SELECT_TRACK', 'SKIP_NEXT', 'SKIP_PREV']),
  positionSeconds: z.number().nonnegative().optional().default(0),
  revision: z.number().int().nonnegative(),
  track: TrackSchema.optional(),
  queueItemId: z.string().optional().nullable(),
  scheduledAt: z.number().optional(),
});

export const QueueActionSchema = z.object({
  roomId: z.string().uuid('Invalid room ID'),
  action: z.enum(['ADD', 'REMOVE', 'ADVANCE']),
  track: TrackSchema.optional(),
  queueItemId: z.string().optional(),
});

export const ModerationActionSchema = z.object({
  roomId: z.string().uuid('Invalid room ID'),
  action: z.enum(['KICK_MEMBER', 'CLOSE_ROOM']),
  targetUserId: z.string().optional(),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type JoinRoomInput = z.infer<typeof JoinRoomSchema>;
export type SearchTracksInput = z.infer<typeof SearchTracksSchema>;
export type PlaybackCommandInput = z.infer<typeof PlaybackCommandSchema>;
export type QueueActionInput = z.infer<typeof QueueActionSchema>;
export type ModerationActionInput = z.infer<typeof ModerationActionSchema>;
