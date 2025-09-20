-- Add eldritch_cannon column to the characters table for Artificer Artillerist
ALTER TABLE characters
ADD COLUMN eldritch_cannon JSONB DEFAULT NULL;

COMMENT ON COLUMN characters.eldritch_cannon IS 'JSONB object storing active Eldritch Cannon data for Artificer Artillerist characters. Contains size, type, current HP, and other cannon properties.';
