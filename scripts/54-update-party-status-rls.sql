-- Open party_status RLS for anon inserts/updates (and allow selects)

-- Ensure RLS is enabled
ALTER TABLE party_status ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies that may block anon
DROP POLICY IF EXISTS "anon insert party_status" ON party_status;
DROP POLICY IF EXISTS "anon update party_status" ON party_status;
DROP POLICY IF EXISTS "anon select party_status" ON party_status;

-- Optionally also drop older authenticated policies if they conflict
-- DROP POLICY IF EXISTS "authenticated insert party_status" ON party_status;
-- DROP POLICY IF EXISTS "authenticated update party_status" ON party_status;
-- DROP POLICY IF EXISTS "authenticated select party_status" ON party_status;

-- Allow anon role to insert any row
CREATE POLICY "anon insert party_status"
ON party_status
AS PERMISSIVE
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon role to update any row (by character_id upsert)
CREATE POLICY "anon update party_status"
ON party_status
AS PERMISSIVE
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anon role to select rows
CREATE POLICY "anon select party_status"
ON party_status
AS PERMISSIVE
FOR SELECT
TO anon
USING (true);


