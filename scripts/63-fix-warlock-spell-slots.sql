-- Fix Warlock spell slots to match Pact Magic system
-- Warlocks have a unique spell slot system where they have a limited number of slots
-- that can be used for any spell level up to their maximum, and they recover on short rests

-- Update the Warlock Genie subclass spell slots
UPDATE classes 
SET 
    spell_slots_1 = ARRAY[1,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4], -- Pact Magic slots (1 at level 1, 2 at level 2, 3 at level 11, 4 at level 17)
    spell_slots_2 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 2nd level slots
    spell_slots_3 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 3rd level slots
    spell_slots_4 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 4th level slots
    spell_slots_5 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 5th level slots
    spell_slots_6 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 6th level slots
    spell_slots_7 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 7th level slots
    spell_slots_8 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 8th level slots
    spell_slots_9 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]  -- No separate 9th level slots
WHERE name = 'Warlock' AND subclass = 'The Genie';

-- Also update the base Warlock class if it exists
UPDATE classes 
SET 
    spell_slots_1 = ARRAY[1,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4], -- Pact Magic slots
    spell_slots_2 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 2nd level slots
    spell_slots_3 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 3rd level slots
    spell_slots_4 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 4th level slots
    spell_slots_5 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 5th level slots
    spell_slots_6 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 6th level slots
    spell_slots_7 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 7th level slots
    spell_slots_8 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No separate 8th level slots
    spell_slots_9 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]  -- No separate 9th level slots
WHERE name = 'Warlock' AND subclass IS NULL;

-- Verify the changes
SELECT 
    'Warlock Spell Slots Fix Verification' as test_name,
    name as class_name,
    subclass,
    spell_slots_1[0] as level_1_slots,
    spell_slots_1[1] as level_2_slots,
    spell_slots_1[10] as level_11_slots,
    spell_slots_1[16] as level_17_slots,
    spell_slots_2[0] as level_1_2nd_slots,
    spell_slots_3[0] as level_1_3rd_slots,
    spell_slots_4[0] as level_1_4th_slots,
    spell_slots_5[0] as level_1_5th_slots
FROM classes 
WHERE name = 'Warlock';

-- Show the corrected spell slot progression
SELECT 
    'Warlock Pact Magic Progression' as description,
    level,
    slots
FROM (
    SELECT 
        generate_series(1, 20) as level,
        CASE 
            WHEN generate_series(1, 20) = 1 THEN 1
            WHEN generate_series(1, 20) BETWEEN 2 AND 10 THEN 2
            WHEN generate_series(1, 20) BETWEEN 11 AND 16 THEN 3
            WHEN generate_series(1, 20) BETWEEN 17 AND 20 THEN 4
        END as slots
) progression
ORDER BY level;
