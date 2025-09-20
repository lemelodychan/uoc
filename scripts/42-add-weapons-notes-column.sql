-- Add weapons_notes column to characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS weapons_notes TEXT DEFAULT '';

-- Add comment to document the column
COMMENT ON COLUMN characters.weapons_notes IS 'Notes about character weapons and weapon-related information';

-- Update existing characters to have empty string if null
UPDATE characters
SET weapons_notes = COALESCE(weapons_notes, '')
WHERE weapons_notes IS NULL;

-- Verify the column was added
SELECT
    'Weapons Notes Column Added' as status,
    COUNT(*) as total_characters,
    COUNT(CASE WHEN weapons_notes IS NOT NULL THEN 1 END) as characters_with_weapons_notes
FROM characters;
