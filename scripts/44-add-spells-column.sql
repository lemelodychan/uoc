-- Add spells column to characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS spells JSONB DEFAULT '[]';

-- Add comment to document the column
COMMENT ON COLUMN characters.spells IS 'Known spells array with spell details (name, level, school, isPrepared)';

-- Update existing characters to have empty array if null
UPDATE characters
SET spells = COALESCE(spells, '[]')
WHERE spells IS NULL;

-- Verify the column was added
SELECT
    'Spells Column Added' as status,
    COUNT(*) as total_characters,
    COUNT(CASE WHEN spells IS NOT NULL THEN 1 END) as characters_with_spells
FROM characters;
