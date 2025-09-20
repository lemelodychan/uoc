-- Create party_status table to track character party status
CREATE TABLE IF NOT EXISTS party_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'away', 'deceased')),
  class_name VARCHAR(50),
  level INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(character_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_party_status_character_id ON party_status(character_id);
CREATE INDEX IF NOT EXISTS idx_party_status_status ON party_status(status);

-- Add RLS policies
ALTER TABLE party_status ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON party_status
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert default 'active' status for existing characters
INSERT INTO party_status (character_id, status, class_name, level)
SELECT id, 'active', class_name, level
FROM characters
WHERE id NOT IN (SELECT character_id FROM party_status)
ON CONFLICT (character_id) DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_party_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_party_status_updated_at
  BEFORE UPDATE ON party_status
  FOR EACH ROW
  EXECUTE FUNCTION update_party_status_updated_at();
