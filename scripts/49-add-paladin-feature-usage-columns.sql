-- Add Paladin-specific feature usage columns to the characters table
-- These columns will store the usage of Divine Sense, Channel Divinity, and Lay on Hands HP

-- Add the new columns
ALTER TABLE characters 
ADD COLUMN divine_sense_used INTEGER DEFAULT 0,
ADD COLUMN channel_divinity_used INTEGER DEFAULT 0,
ADD COLUMN lay_on_hands_hp_used INTEGER DEFAULT 0;

-- Add comments to document the columns
COMMENT ON COLUMN characters.divine_sense_used IS 'Number of Divine Sense uses expended (Paladin feature)';
COMMENT ON COLUMN characters.channel_divinity_used IS 'Number of Channel Divinity uses expended (Paladin feature)';
COMMENT ON COLUMN characters.lay_on_hands_hp_used IS 'Number of hit points expended from Lay on Hands (Paladin feature)';

-- Verify the columns were added
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'characters' 
AND column_name IN ('divine_sense_used', 'channel_divinity_used', 'lay_on_hands_hp_used');
