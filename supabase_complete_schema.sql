-- =====================================================
-- CYCLEOPS — COMPLETE FRESH SCHEMA (Recommended)
-- Run this in a NEW Supabase project for a clean start
-- =====================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- =====================================================
-- 1. PARTICIPANTS TABLE (with custom auth)
-- =====================================================
create table if not exists participants (
  id text primary key,
  name text not null,
  age int,
  phone text,
  emergency text,
  medical boolean default false,
  team_id text,
  access_code text unique,
  password text,                    -- Plain text for this event (simple)
  registered_at timestamptz default now()
);

-- =====================================================
-- 2. CHECKINS TABLE
-- =====================================================
create table if not exists checkins (
  id text primary key,
  cyclist_id text,
  cyclist_name text,
  team_id text,
  cp_id text,
  timestamp timestamptz,
  gps jsonb
);

-- =====================================================
-- 3. GAME ANSWERS (Eye for Detail + any other games)
-- =====================================================
create table if not exists game_answers (
  id text primary key,
  cyclist_id text,
  cyclist_name text,
  team_id text,
  game text,                    -- e.g. 'eye_for_detail'
  answers jsonb,
  score int,
  correct int,
  total int,
  submitted_at timestamptz
);

-- =====================================================
-- 4. JERRICAN CARRY (40-mark game)
-- =====================================================
create table if not exists jerrican_carry (
  id text primary key,
  team_id text,
  start_time timestamptz,
  finish_time timestamptz,
  penalty_count int default 0,
  completed boolean default false,
  notes text,
  updated_at timestamptz default now()
);

-- =====================================================
-- 5. MANUAL SCORES (Admin entered)
-- =====================================================
create table if not exists manual_scores (
  id text primary key,
  team_id text,
  rapid_fire int default 0,           -- 0-15
  finish_questionnaire int default 0, -- 0-5
  updated_at timestamptz default now()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
create index if not exists idx_participants_access_code on participants(access_code);
create index if not exists idx_checkins_cyclist on checkins(cyclist_id);
create index if not exists idx_checkins_cp on checkins(cp_id);
create index if not exists idx_jerrican_team on jerrican_carry(team_id);

-- =====================================================
-- IMPORTANT: Reload schema cache after running this script
-- =====================================================
SELECT pg_notify('pgrst', 'reload schema');

-- =====================================================
-- NOTES FOR THIS EVENT
-- =====================================================
-- For the 30 May 2026 event, it is acceptable to keep RLS disabled
-- on these tables so the anon key can write freely.
--
-- After the event, you can enable RLS + create proper policies.