-- Fix Supabase Security Advisor warnings for overly permissive anon INSERT policies.
-- These policies are no longer needed because all writes are now performed
-- server-side via the service_role key in the API routes.

-- Drop the three permissive anon INSERT policies
DROP POLICY IF EXISTS "Anon can insert check-ins" ON checkins;
DROP POLICY IF EXISTS "Anon can insert own answers" ON game_answers;
DROP POLICY IF EXISTS "Anon can register" ON participants;

-- Verify the updated policies for the affected tables
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('checkins', 'game_answers', 'participants')
ORDER BY tablename, policyname;
