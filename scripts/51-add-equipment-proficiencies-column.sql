-- Add equipment_proficiencies JSONB column to characters
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS equipment_proficiencies JSONB;

COMMENT ON COLUMN characters.equipment_proficiencies IS 'Armor and weapon proficiency flags: { lightArmor, mediumArmor, heavyArmor, shields, simpleWeapons, martialWeapons, firearms }';


