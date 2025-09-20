-- Create long_rest_events table for real-time synchronization
CREATE TABLE IF NOT EXISTS long_rest_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiated_by_character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  selected_character_ids UUID[] NOT NULL,
  event_type VARCHAR(50) NOT NULL DEFAULT 'long_rest_started',
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_long_rest_events_created_at ON long_rest_events(created_at);
CREATE INDEX IF NOT EXISTS idx_long_rest_events_status ON long_rest_events(status);
CREATE INDEX IF NOT EXISTS idx_long_rest_events_initiated_by ON long_rest_events(initiated_by_character_id);
CREATE INDEX IF NOT EXISTS idx_long_rest_events_confirmed_by ON long_rest_events(confirmed_by_character_id);

-- Enable RLS
ALTER TABLE long_rest_events ENABLE ROW LEVEL SECURITY;

-- Allow anon users to insert long rest events
CREATE POLICY "anon insert long_rest_events"
ON long_rest_events
AS PERMISSIVE
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon users to select long rest events
CREATE POLICY "anon select long_rest_events"
ON long_rest_events
AS PERMISSIVE
FOR SELECT
TO anon
USING (true);

-- Allow anon users to update long rest events (for status updates)
CREATE POLICY "anon update long_rest_events"
ON long_rest_events
AS PERMISSIVE
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Add comment for clarity
COMMENT ON TABLE long_rest_events IS 'Tracks long rest events for real-time synchronization across all connected players';
COMMENT ON COLUMN long_rest_events.initiated_by_character_id IS 'Character who initiated the long rest';
COMMENT ON COLUMN long_rest_events.selected_character_ids IS 'Array of character IDs participating in the long rest';
COMMENT ON COLUMN long_rest_events.event_data IS 'Additional event data (effects applied, etc.)';
COMMENT ON COLUMN long_rest_events.status IS 'Processing status of the long rest event';
COMMENT ON COLUMN long_rest_events.confirmed_by_character_id IS 'Character who confirmed/completed the long rest';
COMMENT ON COLUMN long_rest_events.confirmed_at IS 'Timestamp when the long rest was confirmed';
