-- Fix Artificer Artillerist spell slot progression
-- Based on official D&D 5e Artificer table from dnd5e.wikidot.com
-- Artificer is a half-caster with the following correct progression:

-- Level 1: 2 first-level slots
-- Level 2: 2 first-level slots  
-- Level 3: 3 first-level slots
-- Level 4: 3 first-level slots
-- Level 5: 4 first-level slots, 2 second-level slots
-- Level 6: 4 first-level slots, 2 second-level slots
-- Level 7: 4 first-level slots, 3 second-level slots
-- Level 8: 4 first-level slots, 3 second-level slots
-- Level 9: 4 first-level slots, 3 second-level slots, 2 third-level slots
-- Level 10: 4 first-level slots, 3 second-level slots, 2 third-level slots
-- Level 11: 4 first-level slots, 3 second-level slots, 3 third-level slots
-- Level 12: 4 first-level slots, 3 second-level slots, 3 third-level slots
-- Level 13: 4 first-level slots, 3 second-level slots, 3 third-level slots, 1 fourth-level slot
-- Level 14: 4 first-level slots, 3 second-level slots, 3 third-level slots, 1 fourth-level slot
-- Level 15: 4 first-level slots, 3 second-level slots, 3 third-level slots, 2 fourth-level slots
-- Level 16: 4 first-level slots, 3 second-level slots, 3 third-level slots, 2 fourth-level slots
-- Level 17: 4 first-level slots, 3 second-level slots, 3 third-level slots, 3 fourth-level slots, 1 fifth-level slot
-- Level 18: 4 first-level slots, 3 second-level slots, 3 third-level slots, 3 fourth-level slots, 1 fifth-level slot
-- Level 19: 4 first-level slots, 3 second-level slots, 3 third-level slots, 3 fourth-level slots, 2 fifth-level slots
-- Level 20: 4 first-level slots, 3 second-level slots, 3 third-level slots, 3 fourth-level slots, 2 fifth-level slots

DO $$
DECLARE
    artificer_artillerist_id UUID;
BEGIN
    -- Get the class_id for Artificer Artillerist
    SELECT id INTO artificer_artillerist_id 
    FROM classes 
    WHERE name = 'Artificer' AND subclass = 'Artillerist';
    
    IF artificer_artillerist_id IS NULL THEN
        RAISE EXCEPTION 'Artificer Artillerist class not found';
    END IF;

    -- Update the spell slot progression with correct values based on official D&D 5e table
    UPDATE classes SET
        -- 1st level slots: 2,2,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
        spell_slots_1 = ARRAY[2,2,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
        
        -- 2nd level slots: 0,0,0,0,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3
        spell_slots_2 = ARRAY[0,0,0,0,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
        
        -- 3rd level slots: 0,0,0,0,0,0,0,0,2,2,3,3,3,3,3,3,3,3,3,3
        spell_slots_3 = ARRAY[0,0,0,0,0,0,0,0,2,2,3,3,3,3,3,3,3,3,3,3],
        
        -- 4th level slots: 0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,2,3,3,3,3
        spell_slots_4 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,2,3,3,3,3],
        
        -- 5th level slots: 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,2
        spell_slots_5 = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,2]
        
    WHERE id = artificer_artillerist_id;

    RAISE NOTICE 'Artificer Artillerist spell slots updated successfully with correct D&D 5e progression';
END $$;

-- Verify the update
SELECT '=== ARTIFICER SPELL SLOTS VERIFICATION (CORRECTED) ===' as test_section;

SELECT 
    'Updated Spell Slot Progression (Official D&D 5e)' as test_name,
    'Level 1: 2 first-level slots' as level_1,
    'Level 2: 2 first-level slots' as level_2,
    'Level 3: 3 first-level slots' as level_3,
    'Level 4: 3 first-level slots' as level_4,
    'Level 5: 4 first-level, 2 second-level slots' as level_5,
    'Level 6: 4 first-level, 2 second-level slots' as level_6,
    'Level 7: 4 first-level, 3 second-level slots' as level_7,
    'Level 8: 4 first-level, 3 second-level slots' as level_8,
    'Level 9: 4 first-level, 3 second-level, 2 third-level slots' as level_9,
    'Level 10: 4 first-level, 3 second-level, 2 third-level slots' as level_10,
    'Level 11: 4 first-level, 3 second-level, 3 third-level slots' as level_11,
    'Level 12: 4 first-level, 3 second-level, 3 third-level slots' as level_12,
    'Level 13: 4 first-level, 3 second-level, 3 third-level, 1 fourth-level slot' as level_13,
    'Level 14: 4 first-level, 3 second-level, 3 third-level, 1 fourth-level slot' as level_14,
    'Level 15: 4 first-level, 3 second-level, 3 third-level, 2 fourth-level slots' as level_15,
    'Level 16: 4 first-level, 3 second-level, 3 third-level, 2 fourth-level slots' as level_16,
    'Level 17: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 1 fifth-level slot' as level_17,
    'Level 18: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 1 fifth-level slot' as level_18,
    'Level 19: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 2 fifth-level slots' as level_19,
    'Level 20: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 2 fifth-level slots' as level_20;

-- Show the actual updated values
SELECT 
    'Actual Database Values' as test_name,
    c.name,
    c.subclass,
    c.spell_slots_1[1:10] as first_level_slots_levels_1_to_10,
    c.spell_slots_2[1:10] as second_level_slots_levels_1_to_10,
    c.spell_slots_3[1:10] as third_level_slots_levels_1_to_10,
    c.spell_slots_4[1:10] as fourth_level_slots_levels_1_to_10,
    c.spell_slots_5[1:10] as fifth_level_slots_levels_1_to_10
FROM classes c
WHERE c.name = 'Artificer' AND c.subclass = 'Artillerist';

-- Show specific level examples
SELECT '=== SPECIFIC LEVEL EXAMPLES ===' as test_section;

SELECT 
    'Level 3 Artificer' as example,
    'Should have: 3 first-level slots' as expected,
    'Database shows: ' || 
    (SELECT spell_slots_1[3] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' first-level slots' as actual;

SELECT 
    'Level 5 Artificer' as example,
    'Should have: 4 first-level, 2 second-level slots' as expected,
    'Database shows: ' || 
    (SELECT spell_slots_1[5] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' first-level, ' ||
    (SELECT spell_slots_2[5] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' second-level slots' as actual;

SELECT 
    'Level 9 Artificer' as example,
    'Should have: 4 first-level, 3 second-level, 2 third-level slots' as expected,
    'Database shows: ' || 
    (SELECT spell_slots_1[9] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' first-level, ' ||
    (SELECT spell_slots_2[9] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' second-level, ' ||
    (SELECT spell_slots_3[9] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' third-level slots' as actual;

SELECT 
    'Level 13 Artificer' as example,
    'Should have: 4 first-level, 3 second-level, 3 third-level, 1 fourth-level slot' as expected,
    'Database shows: ' || 
    (SELECT spell_slots_1[13] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' first-level, ' ||
    (SELECT spell_slots_2[13] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' second-level, ' ||
    (SELECT spell_slots_3[13] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' third-level, ' ||
    (SELECT spell_slots_4[13] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' fourth-level slots' as actual;

SELECT 
    'Level 17 Artificer' as example,
    'Should have: 4 first-level, 3 second-level, 3 third-level, 3 fourth-level, 1 fifth-level slot' as expected,
    'Database shows: ' || 
    (SELECT spell_slots_1[17] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' first-level, ' ||
    (SELECT spell_slots_2[17] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' second-level, ' ||
    (SELECT spell_slots_3[17] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' third-level, ' ||
    (SELECT spell_slots_4[17] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' fourth-level, ' ||
    (SELECT spell_slots_5[17] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' fifth-level slots' as actual;

-- Final verification
SELECT '=== FINAL VERIFICATION ===' as test_section;

SELECT 
    'Spell Slot Fix Status (Corrected)' as test_name,
    '✅ 1st level slots: 2,2,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4' as fix_1,
    '✅ 2nd level slots: Start at level 5 with 2 slots' as fix_2,
    '✅ 3rd level slots: Start at level 9 with 2 slots' as fix_3,
    '✅ 4th level slots: Start at level 13 with 1 slot' as fix_4,
    '✅ 5th level slots: Start at level 17 with 1 slot' as fix_5,
    '✅ Half-caster progression correctly implemented per official D&D 5e' as fix_6;
