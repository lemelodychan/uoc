-- Add magic_items column to characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS magic_items JSONB DEFAULT '[]';

-- Add comment to document the column
COMMENT ON COLUMN characters.magic_items IS 'Magic items with usage tracking (name, description, maxUses, dailyRecharge, currentUses)';

-- Update existing characters to have empty array if null
UPDATE characters
SET magic_items = COALESCE(magic_items, '[]')
WHERE magic_items IS NULL;

-- Verify the column was added
SELECT
    'Magic Items Column Added' as status,
    COUNT(*) as total_characters,
    COUNT(CASE WHEN magic_items IS NOT NULL THEN 1 END) as characters_with_magic_items
FROM characters;
