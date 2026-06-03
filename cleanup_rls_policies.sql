-- Fix overly permissive INSERT policies for anon 
-- These tables now use server-side writes via service_role, so anon INSERT is no longer needed.

-- Drop the permissive anon INSERT policies
DROP POLICY IF EXISTS "Anon can insert check-ins" ON checkins;
DROP POLICY IF EXISTS "Anon can insert own answers" ON game_answers;
DROP POLICY IF EXISTS "Anon can register" ON participants;

-- Verify the remaining policies for these tables
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('checkins', 'game_answers', 'participants')
ORDER BY tablename, policyname;
