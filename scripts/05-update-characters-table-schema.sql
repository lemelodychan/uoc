-- Add foreign key relationships to classes and subclasses tables
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id),
ADD COLUMN IF NOT EXISTS subclass_id UUID REFERENCES subclasses(id);

-- Add rich text columns for character details
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS personality_traits TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS ideals TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS bonds TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS flaws TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS backstory TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Add proficiency bonus (calculated from level but stored for easy access)
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS proficiency_bonus INTEGER DEFAULT 2;

-- Update existing characters to have proper class relationships
-- This will set class_id based on existing class_name values
UPDATE characters 
SET class_id = (SELECT id FROM classes WHERE classes.name = characters.class_name)
WHERE class_id IS NULL AND class_name IS NOT NULL;

-- Update proficiency bonus based on level
UPDATE characters 
SET proficiency_bonus = CASE 
  WHEN level >= 17 THEN 6
  WHEN level >= 13 THEN 5
  WHEN level >= 9 THEN 4
  WHEN level >= 5 THEN 3
  ELSE 2
END
WHERE proficiency_bonus = 2; -- Only update default values

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_characters_class_id ON characters(class_id);
CREATE INDEX IF NOT EXISTS idx_characters_subclass_id ON characters(subclass_id);

-- Add constraint to ensure class_id is set when class_name is provided
-- (We'll keep class_name for backward compatibility but prefer class_id)
