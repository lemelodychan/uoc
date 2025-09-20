-- Add character image URL column for portraits/avatars
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN characters.image_url IS 'Character portrait image URL used in sheet header and sidebar.';


