-- Fix Paladin spell slot progression to match official D&D 5e table
-- This updates the existing Paladin class data with the correct spell slot progression

UPDATE classes 
SET 
  spell_slots_1 = ARRAY[0,2,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
  spell_slots_2 = ARRAY[0,0,0,0,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  spell_slots_3 = ARRAY[0,0,0,0,0,0,0,0,2,2,3,3,3,3,3,3,3,3,3,3],
  spell_slots_4 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,2,3,3,3,3],
  spell_slots_5 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,2]
WHERE name = 'Paladin';

-- Verify the update
SELECT name, subclass, 
  spell_slots_1[1:5] as "Levels 1-5 (1st level slots)",
  spell_slots_2[1:5] as "Levels 1-5 (2nd level slots)",
  spell_slots_3[1:5] as "Levels 1-5 (3rd level slots)"
FROM classes 
WHERE name = 'Paladin';
