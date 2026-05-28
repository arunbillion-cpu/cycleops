-- =====================================================
-- CYCLEOPS — Supabase Schema Updates (30 May 2026 Event)
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add columns to participants table for secure login
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS access_code text,
ADD COLUMN IF NOT EXISTS password text;

-- Optional but recommended: make access_code easier to query
CREATE INDEX IF NOT EXISTS idx_participants_access_code 
ON participants (access_code);

COMMENT ON COLUMN participants.access_code IS 'Unique code shown to cyclist after registration (e.g. CYC-7K9P)';
COMMENT ON COLUMN participants.password IS 'Password chosen by cyclist during registration (plain text for this internal event app)';

-- =====================================================
-- CRITICAL: Reload PostgREST schema cache
-- Run this after adding columns so Supabase sees them immediately
-- =====================================================
SELECT pg_notify('pgrst', 'reload schema');

-- =====================================================
-- 2. Recommended new tables for the new event structure
-- (Run these too for full functionality)
-- =====================================================

-- For Eye for Detail answers (30 marks game at CP2)
CREATE TABLE IF NOT EXISTS observation_answers (
  id text PRIMARY KEY,
  cyclist_id text,
  cyclist_name text,
  team_id text,
  answers jsonb,
  score int,
  total_questions int,
  submitted_at timestamptz
);

-- For Jerrican carry tracking (40-mark game)
CREATE TABLE IF NOT EXISTS jerrican_carry (
  id text PRIMARY KEY,
  team_id text,
  start_time timestamptz,           -- When they picked up jerricans at CP2
  finish_time timestamptz,          -- When they reached Finish with both jerricans
  penalty_count int DEFAULT 0,      -- Number of 5-point violations
  completed boolean DEFAULT false,
  notes text
);

-- For Admin manual scores (Rapid Fire + Finish Questionnaire)
CREATE TABLE IF NOT EXISTS manual_scores (
  id text PRIMARY KEY,
  team_id text,
  rapid_fire int,                   -- 0-15
  finish_questionnaire int,         -- 0-5
  updated_at timestamptz
);

-- =====================================================
-- 3. (Optional) Enable RLS later if needed
-- For now, keep RLS disabled as discussed for the event.
-- =====================================================

-- After the event you can tighten security.