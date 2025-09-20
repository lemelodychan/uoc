-- Add equipment, languages, and otherTools columns to characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS equipment TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS languages TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS other_tools TEXT DEFAULT '';

-- Add comments to document the columns
COMMENT ON COLUMN characters.equipment IS 'Character equipment and gear';
COMMENT ON COLUMN characters.languages IS 'Languages known by the character';
COMMENT ON COLUMN characters.other_tools IS 'Other tools and items not covered by tools proficiencies';

-- Update existing characters to have empty strings if null
UPDATE characters
SET equipment = COALESCE(equipment, ''),
    languages = COALESCE(languages, ''),
    other_tools = COALESCE(other_tools, '')
WHERE equipment IS NULL OR languages IS NULL OR other_tools IS NULL;

-- Verify the columns were added
SELECT
    'Equipment, Languages, and Other Tools Columns Added' as status,
    COUNT(*) as total_characters,
    COUNT(CASE WHEN equipment IS NOT NULL THEN 1 END) as characters_with_equipment,
    COUNT(CASE WHEN languages IS NOT NULL THEN 1 END) as characters_with_languages,
    COUNT(CASE WHEN other_tools IS NOT NULL THEN 1 END) as characters_with_other_tools
FROM characters;
