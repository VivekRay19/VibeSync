-- ==============================================================================
-- VibeSync Neon PostgreSQL Schema Migration (001)
-- Branch: production (br-hidden-recipe-b3xwjae5)
-- Project: cold-smoke-08579073
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. PROFILES / IDENTITIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. ROOMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS rooms_owner_idx ON public.rooms (owner_id);

-- ------------------------------------------------------------------------------
-- 3. ROOM MEMBERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT room_members_room_user_unique UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS room_members_room_idx ON public.room_members (room_id);
CREATE INDEX IF NOT EXISTS room_members_user_idx ON public.room_members (user_id);

-- ------------------------------------------------------------------------------
-- 4. PLAYBACK STATE (One authoritative record per room)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.playback_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID UNIQUE NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL CHECK (provider_id IN ('audius', 'jamendo')),
  provider_track_id TEXT NOT NULL,
  track_metadata JSONB NOT NULL,
  playback_status TEXT NOT NULL DEFAULT 'paused' CHECK (playback_status IN ('playing', 'paused', 'ended', 'buffering')),
  base_position_seconds NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revision BIGINT NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL,
  updated_by_name TEXT NOT NULL DEFAULT 'Unknown',
  current_queue_item_id UUID
);

CREATE INDEX IF NOT EXISTS playback_state_room_idx ON public.playback_state (room_id);

-- ------------------------------------------------------------------------------
-- 5. QUEUE ITEMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL CHECK (provider_id IN ('audius', 'jamendo')),
  provider_track_id TEXT NOT NULL,
  track_metadata JSONB NOT NULL,
  added_by TEXT NOT NULL,
  added_by_name TEXT NOT NULL,
  queue_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'played'))
);

CREATE INDEX IF NOT EXISTS queue_items_room_status_idx ON public.queue_items (room_id, status, queue_position);
