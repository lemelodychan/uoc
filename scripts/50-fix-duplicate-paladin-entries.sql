-- Fix duplicate Paladin entries in the classes table
-- This script will identify and clean up duplicate Paladin class entries

-- First, let's see what Paladin entries exist
SELECT id, name, subclass, created_at 
FROM classes 
WHERE name = 'Paladin' 
ORDER BY created_at;

-- Check if there are multiple Paladin entries
SELECT name, subclass, COUNT(*) as count
FROM classes 
WHERE name = 'Paladin'
GROUP BY name, subclass
HAVING COUNT(*) > 1;

-- If there are duplicates, we need to:
-- 1. Keep the most recent entry (or the one with correct data)
-- 2. Delete the older/incorrect entries
-- 3. Update any characters that reference the deleted class_id

-- Let's see which characters are using which Paladin class_id
SELECT c.id as character_id, c.name as character_name, c.class_name, c.subclass, c.class_id
FROM characters c
JOIN classes cl ON c.class_id = cl.id
WHERE cl.name = 'Paladin';

-- To fix this, we'll need to:
-- 1. Identify the correct Paladin entry (the one with the correct spell slot progression)
-- 2. Update all characters to use the correct class_id
-- 3. Delete the duplicate entries

-- Let's check the spell slot progression of each Paladin entry
SELECT id, name, subclass, 
  spell_slots_1[1:5] as "Levels 1-5 (1st level slots)",
  spell_slots_2[1:5] as "Levels 1-5 (2nd level slots)",
  spell_slots_3[1:5] as "Levels 1-5 (3rd level slots)"
FROM classes 
WHERE name = 'Paladin'
ORDER BY created_at;
