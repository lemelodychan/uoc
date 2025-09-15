-- Temporarily disable RLS on characters table to allow saving without authentication
-- This should be re-enabled once authentication is implemented

ALTER TABLE characters DISABLE ROW LEVEL SECURITY;

-- Optional: Add a policy for anonymous access (alternative to disabling RLS)
-- Uncomment these lines if you prefer to keep RLS enabled but allow anonymous access:

-- DROP POLICY IF EXISTS "Users can view own characters" ON characters;
-- DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
-- DROP POLICY IF EXISTS "Users can update own characters" ON characters;
-- DROP POLICY IF EXISTS "Users can delete own characters" ON characters;

-- CREATE POLICY "Allow anonymous access" ON characters FOR ALL USING (true);
