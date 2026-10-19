-- ==============================================================================
-- VibeSync Initial Schema Migration
-- Collaborative Music Listening Platform
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 2. ROOMS
-- ------------------------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  name text not null,
  owner_id uuid not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if reference_rooms_code_idx on public.rooms (room_code);
create index if not exists rooms_owner_idx on public.rooms (owner_id);

-- ------------------------------------------------------------------------------
-- 3. ROOM MEMBERS
-- ------------------------------------------------------------------------------
create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  constraint room_members_room_user_unique unique (room_id, user_id)
);

create index if not exists room_members_room_idx on public.room_members (room_id);
create index if not exists room_members_user_idx on public.room_members (user_id);

-- ------------------------------------------------------------------------------
-- 4. PLAYBACK STATE (One authoritative record per room)
-- ------------------------------------------------------------------------------
create table if not exists public.playback_state (
  id uuid primary key default gen_random_uuid(),
  room_id uuid unique not null references public.rooms(id) on delete cascade,
  provider_id text not null check (provider_id in ('audius', 'jamendo')),
  provider_track_id text not null,
  track_metadata jsonb not null,
  playback_status text not null default 'paused' check (playback_status in ('playing', 'paused', 'ended', 'buffering')),
  base_position_seconds numeric not null default 0,
  updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  updated_by uuid not null,
  updated_by_name text not null default 'Unknown',
  current_queue_item_id uuid
);

create index if not exists playback_state_room_idx on public.playback_state (room_id);

-- ------------------------------------------------------------------------------
-- 5. QUEUE ITEMS
-- ------------------------------------------------------------------------------
create table if not exists public.queue_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  provider_id text not null check (provider_id in ('audius', 'jamendo')),
  provider_track_id text not null,
  track_metadata jsonb not null,
  added_by uuid not null,
  added_by_name text not null,
  queue_position integer not null default 0,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'playing', 'played'))
);

create index if not exists queue_items_room_status_idx on public.queue_items (room_id, status, queue_position);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.playback_state enable row level security;
alter table public.queue_items enable row level security;

-- Profiles: Anyone can read, users can update their own
create policy "Allow public read access to profiles" on public.profiles
  for select using (true);

create policy "Allow users to insert/update their own profile" on public.profiles
  for all using (true) with check (true);

-- Rooms: Anyone can read active rooms, authenticated/guests can create, owner can update
create policy "Allow read access to rooms" on public.rooms
  for select using (true);

create policy "Allow room creation" on public.rooms
  for insert with check (true);

create policy "Allow room owner to update room" on public.rooms
  for update using (true);

-- Room Members: Read for room participants, insert for joining, delete for leaving/kick
create policy "Allow read room_members" on public.room_members
  for select using (true);

create policy "Allow insert room_members" on public.room_members
  for insert with check (true);

create policy "Allow delete room_members" on public.room_members
  for delete using (true);

-- Playback State: Read for room members, update for room members
create policy "Allow read playback_state" on public.playback_state
  for select using (true);

create policy "Allow update playback_state" on public.playback_state
  for all using (true) with check (true);

-- Queue Items: Read for room members, insert for room members, update/delete
create policy "Allow read queue_items" on public.queue_items
  for select using (true);

create policy "Allow insert queue_items" on public.queue_items
  for insert with check (true);

create policy "Allow update queue_items" on public.queue_items
  for update using (true);

create policy "Allow delete queue_items" on public.queue_items
  for delete using (true);

-- ------------------------------------------------------------------------------
-- REALTIME REPLICATION PUBLICATION
-- ------------------------------------------------------------------------------
-- Enable Supabase Realtime for collaborative tables
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.playback_state;
alter publication supabase_realtime add table public.queue_items;
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.rooms;
