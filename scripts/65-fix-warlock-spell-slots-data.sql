-- Fix Warlock spell slot data in the database
-- This script consolidates Warlock spell slot usage into the unified Pact Magic system

-- First, let's see the current state of Warlock characters
SELECT 
    'Current Warlock Characters' as section,
    id,
    name,
    class_name,
    level,
    spell_slots_1_used,
    spell_slots_2_used,
    spell_slots_3_used,
    spell_slots_4_used,
    spell_slots_5_used,
    spell_slots_6_used,
    spell_slots_7_used,
    spell_slots_8_used,
    spell_slots_9_used
FROM characters 
WHERE class_name = 'Warlock';

-- Update Warlock characters to use unified Pact Magic system
-- For Warlocks, we'll use spell_slots_1_used as the unified counter
-- and set all other levels to 0
-- IMPORTANT: spell_slots_1_used = 0 means ALL slots are available (unused)
UPDATE characters 
SET 
    -- Reset spell_slots_1_used to 0 (meaning all slots are available)
    spell_slots_1_used = 0,
    -- Set all other levels to 0 for Warlocks
    spell_slots_2_used = 0,
    spell_slots_3_used = 0,
    spell_slots_4_used = 0,
    spell_slots_5_used = 0,
    spell_slots_6_used = 0,
    spell_slots_7_used = 0,
    spell_slots_8_used = 0,
    spell_slots_9_used = 0,
    updated_at = NOW()
WHERE class_name = 'Warlock';

-- Verify the changes
SELECT 
    'Updated Warlock Characters' as section,
    id,
    name,
    class_name,
    level,
    spell_slots_1_used,
    spell_slots_2_used,
    spell_slots_3_used,
    spell_slots_4_used,
    spell_slots_5_used,
    spell_slots_6_used,
    spell_slots_7_used,
    spell_slots_8_used,
    spell_slots_9_used
FROM characters 
WHERE class_name = 'Warlock';

-- Show summary of changes
SELECT 
    'Summary' as section,
    COUNT(*) as warlock_characters_updated,
    'Warlock spell slots have been consolidated into unified Pact Magic system' as description;
