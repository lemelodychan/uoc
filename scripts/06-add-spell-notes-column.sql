-- Add spell_notes column to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS spell_notes TEXT DEFAULT '';
