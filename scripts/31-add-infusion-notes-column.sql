-- Add infusion_notes column to characters table for Artificer infusion notes
-- This column will store rich text notes about infusions, similar to spell_notes

ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS infusion_notes TEXT DEFAULT '';

-- Add comment to document the column
COMMENT ON COLUMN characters.infusion_notes IS 'Rich text notes about Artificer infusions, displayed for Artificer characters only';

-- Update existing Artificer characters to have empty infusion notes
UPDATE characters 
SET infusion_notes = ''
WHERE class_name = 'Artificer' AND (infusion_notes IS NULL OR infusion_notes = '');

-- Verify the column was added
SELECT 
    'Infusion Notes Column Added' as status,
    COUNT(*) as total_characters,
    COUNT(CASE WHEN class_name = 'Artificer' THEN 1 END) as artificer_characters
FROM characters;
