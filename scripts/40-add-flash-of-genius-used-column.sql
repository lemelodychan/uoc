-- Add flash_of_genius_used column to characters table to track used charges
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS flash_of_genius_used INTEGER DEFAULT 0;

-- Verify update
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'characters' AND column_name = 'flash_of_genius_used';
