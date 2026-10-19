import { describe, it, expect } from 'vitest';
import {
  CreateRoomSchema,
  JoinRoomSchema,
  PlaybackCommandSchema,
  SearchTracksSchema,
} from '@/lib/validations/room-schema';

describe('Zod Validation Schemas', () => {
  describe('CreateRoomSchema', () => {
    it('accepts valid room creation payload', () => {
      const result = CreateRoomSchema.safeParse({
        name: 'Late Night Chill',
        displayName: 'Sam',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short room name', () => {
      const result = CreateRoomSchema.safeParse({
        name: 'A',
        displayName: 'Sam',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty display name', () => {
      const result = CreateRoomSchema.safeParse({
        name: 'Valid Name',
        displayName: '   ',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('JoinRoomSchema', () => {
    it('converts room code to uppercase and validates', () => {
      const result = JoinRoomSchema.safeParse({
        roomCode: 'abc123',
        displayName: 'Alex',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.roomCode).toBe('ABC123');
      }
    });

    it('rejects invalid code length', () => {
      const result = JoinRoomSchema.safeParse({
        roomCode: 'AB',
        displayName: 'Alex',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PlaybackCommandSchema', () => {
    it('accepts valid playback commands with non-negative revision and position', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = PlaybackCommandSchema.safeParse({
        roomId: validUuid,
        command: 'PLAY',
        positionSeconds: 15.2,
        revision: 4,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid command type', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = PlaybackCommandSchema.safeParse({
        roomId: validUuid,
        command: 'FAST_FORWARD', // Not in enum
        revision: 1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative position or revision', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = PlaybackCommandSchema.safeParse({
        roomId: validUuid,
        command: 'SEEK',
        positionSeconds: -5,
        revision: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SearchTracksSchema', () => {
    it('accepts valid query and defaults provider to all', () => {
      const result = SearchTracksSchema.safeParse({
        query: 'electronic chill',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe('all');
        expect(result.data.page).toBe(1);
      }
    });

    it('rejects empty search query', () => {
      const result = SearchTracksSchema.safeParse({
        query: '   ',
      });
      expect(result.success).toBe(false);
    });
  });
});
