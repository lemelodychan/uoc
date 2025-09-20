-- Add initiative column to characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS initiative INTEGER DEFAULT 0;


