-- Updated to work with existing classes table structure (subclass as TEXT column, not separate table)
-- Update characters table to work with existing classes table structure
-- Add foreign key relationship to classes table

-- Add class_id column if it doesn't exist
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);

-- Add rich text columns for character details
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS personality_traits TEXT,
ADD COLUMN IF NOT EXISTS ideals TEXT,
ADD COLUMN IF NOT EXISTS bonds TEXT,
ADD COLUMN IF NOT EXISTS flaws TEXT,
ADD COLUMN IF NOT EXISTS backstory TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for the new foreign key
CREATE INDEX IF NOT EXISTS idx_characters_class_id ON characters(class_id);

-- Update existing characters to link to classes table (optional migration)
-- This assumes you want to migrate existing text-based class/subclass to the new structure
-- You can run this manually for existing characters or skip if starting fresh

-- Example migration (uncomment if needed):
-- UPDATE characters 
-- SET class_id = (SELECT id FROM classes WHERE name = characters.class AND subclass = characters.subclass LIMIT 1)
-- WHERE class_id IS NULL AND class IS NOT NULL;

-- Optional: Remove old class/subclass text columns after migration
-- ALTER TABLE characters DROP COLUMN IF EXISTS class;
-- ALTER TABLE characters DROP COLUMN IF EXISTS subclass;
