-- Add infusions column to characters table for Artificer infusions
-- This column will store JSONB data for infusions with title, description, and attunement requirement

ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS infusions JSONB DEFAULT '[]';

-- Add comment to document the column
COMMENT ON COLUMN characters.infusions IS 'JSONB array of Artificer infusions with title, description, and attunement requirement';

-- Create index for infusions column for better query performance
CREATE INDEX IF NOT EXISTS idx_characters_infusions ON characters USING GIN (infusions);

-- Example of the expected JSONB structure:
-- [
--   {
--     "title": "Enhanced Weapon",
--     "description": "A simple or martial weapon gains a +1 bonus to attack and damage rolls.",
--     "needsAttunement": false
--   },
--   {
--     "title": "Bag of Holding",
--     "description": "A bag of holding can hold up to 500 pounds, not exceeding a volume of 64 cubic feet.",
--     "needsAttunement": false
--   },
--   {
--     "title": "Cloak of Protection",
--     "description": "While wearing this cloak, you gain a +1 bonus to AC and saving throws.",
--     "needsAttunement": true
--   }
-- ]
