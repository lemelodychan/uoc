-- Add exhaustion and hit dice columns to the characters table
ALTER TABLE characters
ADD COLUMN exhaustion INTEGER DEFAULT 0,
ADD COLUMN hit_dice_total INTEGER DEFAULT 0,
ADD COLUMN hit_dice_used INTEGER DEFAULT 0,
ADD COLUMN hit_dice_type VARCHAR(10) DEFAULT 'd8';

-- Add comments for clarity
COMMENT ON COLUMN characters.exhaustion IS 'Exhaustion level (0-6) for the character.';
COMMENT ON COLUMN characters.hit_dice_total IS 'Total number of hit dice available to the character.';
COMMENT ON COLUMN characters.hit_dice_used IS 'Number of hit dice used by the character.';
COMMENT ON COLUMN characters.hit_dice_type IS 'Type of hit dice (d4, d6, d8, d10, d12, d20).';

-- Update existing characters to have default hit dice based on their level
UPDATE characters 
SET 
  hit_dice_total = level,
  hit_dice_used = 0,
  hit_dice_type = CASE 
    WHEN class = 'Barbarian' THEN 'd12'
    WHEN class = 'Fighter' OR class = 'Paladin' OR class = 'Ranger' THEN 'd10'
    WHEN class = 'Bard' OR class = 'Cleric' OR class = 'Druid' OR class = 'Monk' OR class = 'Rogue' OR class = 'Warlock' THEN 'd8'
    WHEN class = 'Sorcerer' OR class = 'Wizard' THEN 'd6'
    WHEN class = 'Artificer' THEN 'd8'
    ELSE 'd8'
  END
WHERE hit_dice_total IS NULL OR hit_dice_total = 0;
