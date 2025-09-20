-- Debug script to check Paladin spell slot data in the database
-- This will help identify if the database update was applied correctly

-- Check current Paladin spell slot data
SELECT 
  name, 
  subclass,
  spell_slots_1[1:5] as "Levels 1-5 (1st level slots)",
  spell_slots_2[1:5] as "Levels 1-5 (2nd level slots)",
  spell_slots_3[1:5] as "Levels 1-5 (3rd level slots)",
  spell_slots_4[1:5] as "Levels 1-5 (4th level slots)",
  spell_slots_5[1:5] as "Levels 1-5 (5th level slots)"
FROM classes 
WHERE name = 'Paladin';

-- Check if there are multiple Paladin entries
SELECT COUNT(*) as paladin_count FROM classes WHERE name = 'Paladin';

-- Show all Paladin entries with their IDs
SELECT id, name, subclass FROM classes WHERE name = 'Paladin';
