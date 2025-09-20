-- Add warlock_spell_slots_used column to characters table
-- This column will store the number of Warlock Pact Magic spell slots used

ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS warlock_spell_slots_used INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN characters.warlock_spell_slots_used IS 'Number of Warlock Pact Magic spell slots used (for Warlocks only)';

-- Verify the column was added
SELECT 
    'Warlock Spell Slots Column Added' as test_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'characters' 
AND column_name = 'warlock_spell_slots_used';
