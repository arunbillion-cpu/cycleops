-- =====================================================
-- CycleOps - Apply Light Pragmatic RLS Policies
-- Run this in Supabase SQL Editor after cleaning data
-- =====================================================

-- 1. Enable RLS on all tables (safe if already enabled)
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jerrican_carry ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_scores ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to make this script idempotent
DROP POLICY IF EXISTS "Service role has full access" ON participants;
DROP POLICY IF EXISTS "Anon can register" ON participants;
DROP POLICY IF EXISTS "Anon can view participants" ON participants;

DROP POLICY IF EXISTS "Service role has full access" ON checkins;
DROP POLICY IF EXISTS "Anon can insert check-ins" ON checkins;
DROP POLICY IF EXISTS "Anon can view check-ins" ON checkins;

DROP POLICY IF EXISTS "Service role has full access" ON game_answers;
DROP POLICY IF EXISTS "Anon can insert own answers" ON game_answers;
DROP POLICY IF EXISTS "Anon can view game answers" ON game_answers;

DROP POLICY IF EXISTS "Service role has full access" ON jerrican_carry;
DROP POLICY IF EXISTS "No access for anon" ON jerrican_carry;

DROP POLICY IF EXISTS "Service role has full access" ON manual_scores;
DROP POLICY IF EXISTS "No access for anon" ON manual_scores;

-- 3. Service role policies (full access for server-side routes)
CREATE POLICY "Service role has full access"
ON participants FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access"
ON checkins FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access"
ON game_answers FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access"
ON jerrican_carry FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access"
ON manual_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Anon policies (light pragmatic version)
-- Participants: Allow registration (INSERT) and basic viewing
CREATE POLICY "Anon can register"
ON participants FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can view participants"
ON participants FOR SELECT TO anon USING (true);

-- Checkins: Participants need to insert their own check-ins
CREATE POLICY "Anon can insert check-ins"
ON checkins FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can view check-ins"
ON checkins FOR SELECT TO anon USING (true);

-- Game answers: Participants submit their own answers
CREATE POLICY "Anon can insert own answers"
ON game_answers FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can view game answers"
ON game_answers FOR SELECT TO anon USING (true);

-- Admin-only tables: No access for anon
CREATE POLICY "No access for anon"
ON jerrican_carry FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "No access for anon"
ON manual_scores FOR ALL TO anon USING (false) WITH CHECK (false);

-- 5. Verification
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
