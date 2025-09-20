-- Add saving throw proficiencies column to characters table
-- This column will store JSONB data for saving throw proficiencies

ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS saving_throw_proficiencies JSONB DEFAULT '[]';

-- Add comment to document the column
COMMENT ON COLUMN characters.saving_throw_proficiencies IS 'JSONB array of saving throw proficiencies with ability and proficient flag';

-- Create index for saving throw proficiencies column for better query performance
CREATE INDEX IF NOT EXISTS idx_characters_saving_throw_proficiencies ON characters USING GIN (saving_throw_proficiencies);

-- Example of the expected JSONB structure:
-- [
--   {
--     "ability": "strength",
--     "proficient": false
--   },
--   {
--     "ability": "dexterity", 
--     "proficient": true
--   },
--   {
--     "ability": "constitution",
--     "proficient": false
--   },
--   {
--     "ability": "intelligence",
--     "proficient": false
--   },
--   {
--     "ability": "wisdom",
--     "proficient": true
--   },
--   {
--     "ability": "charisma",
--     "proficient": false
--   }
-- ]
