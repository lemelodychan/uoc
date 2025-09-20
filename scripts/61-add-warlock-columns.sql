-- Add Warlock-specific columns to the characters table
-- These columns store Warlock class features and their usage

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS eldritch_invocations JSONB,
ADD COLUMN IF NOT EXISTS mystic_arcanum JSONB,
ADD COLUMN IF NOT EXISTS genie_wrath JSONB,
ADD COLUMN IF NOT EXISTS elemental_gift JSONB,
ADD COLUMN IF NOT EXISTS sanctuary_vessel JSONB,
ADD COLUMN IF NOT EXISTS limited_wish JSONB;

-- Add comments for documentation
COMMENT ON COLUMN characters.eldritch_invocations IS 'JSONB array storing Eldritch Invocations for Warlocks';
COMMENT ON COLUMN characters.mystic_arcanum IS 'JSONB array storing Mystic Arcanum spells for Warlocks';
COMMENT ON COLUMN characters.genie_wrath IS 'JSONB object storing Genie Wrath feature data (damage type, uses)';
COMMENT ON COLUMN characters.elemental_gift IS 'JSONB object storing Elemental Gift feature data (resistance, flying)';
COMMENT ON COLUMN characters.sanctuary_vessel IS 'JSONB object storing Sanctuary Vessel feature data (vessel type, hours)';
COMMENT ON COLUMN characters.limited_wish IS 'JSONB object storing Limited Wish feature data (uses, cooldown)';

-- Verify the columns were added
SELECT 
    'Warlock Columns Verification' as test_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'characters' 
  AND column_name IN ('eldritch_invocations', 'mystic_arcanum', 'genie_wrath', 'elemental_gift', 'sanctuary_vessel', 'limited_wish')
ORDER BY column_name;
