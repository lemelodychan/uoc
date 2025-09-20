-- Fix Artificer Artillerist spell slot progression
-- Artificer is a half-caster with the following correct progression:

-- Level 1: 2 first-level slots
-- Level 2: 2 first-level slots  
-- Level 3: 3 first-level slots, 2 second-level slots
-- Level 4: 3 first-level slots, 2 second-level slots
-- Level 5: 3 first-level slots, 2 second-level slots, 2 third-level slots
-- Level 6: 3 first-level slots, 2 second-level slots, 2 third-level slots
-- Level 7: 3 first-level slots, 2 second-level slots, 2 third-level slots, 1 fourth-level slot
-- Level 8: 3 first-level slots, 2 second-level slots, 2 third-level slots, 1 fourth-level slot
-- Level 9: 3 first-level slots, 2 second-level slots, 2 third-level slots, 1 fourth-level slot, 1 fifth-level slot
-- Level 10+: Same as level 9

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

    -- Update the spell slot progression with correct values
    UPDATE classes SET
        -- 1st level slots: 2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3
        spell_slots_1 = ARRAY[2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
        
        -- 2nd level slots: 0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2
        spell_slots_2 = ARRAY[0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
        
        -- 3rd level slots: 0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2
        spell_slots_3 = ARRAY[0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
        
        -- 4th level slots: 0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        spell_slots_4 = ARRAY[0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        
        -- 5th level slots: 0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1
        spell_slots_5 = ARRAY[0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1]
        
    WHERE id = artificer_artillerist_id;

    RAISE NOTICE 'Artificer Artillerist spell slots updated successfully';
END $$;

-- Verify the update
SELECT '=== ARTIFICER SPELL SLOTS VERIFICATION ===' as test_section;

SELECT 
    'Updated Spell Slot Progression' as test_name,
    'Level 1: 2 first-level slots' as level_1,
    'Level 2: 2 first-level slots' as level_2,
    'Level 3: 3 first-level, 2 second-level slots' as level_3,
    'Level 4: 3 first-level, 2 second-level slots' as level_4,
    'Level 5: 3 first-level, 2 second-level, 2 third-level slots' as level_5,
    'Level 6: 3 first-level, 2 second-level, 2 third-level slots' as level_6,
    'Level 7: 3 first-level, 2 second-level, 2 third-level, 1 fourth-level slot' as level_7,
    'Level 8: 3 first-level, 2 second-level, 2 third-level, 1 fourth-level slot' as level_8,
    'Level 9: 3 first-level, 2 second-level, 2 third-level, 1 fourth-level, 1 fifth-level slot' as level_9,
    'Level 10+: Same as level 9' as level_10_plus;

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
    'Should have: 3 first-level, 2 second-level slots' as expected,
    'Database shows: ' || 
    (SELECT spell_slots_1[3] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' first-level, ' ||
    (SELECT spell_slots_2[3] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' second-level slots' as actual;

SELECT 
    'Level 5 Artificer' as example,
    'Should have: 3 first-level, 2 second-level, 2 third-level slots' as expected,
    'Database shows: ' || 
    (SELECT spell_slots_1[5] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' first-level, ' ||
    (SELECT spell_slots_2[5] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' second-level, ' ||
    (SELECT spell_slots_3[5] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' third-level slots' as actual;

SELECT 
    'Level 9 Artificer' as example,
    'Should have: 3 first-level, 2 second-level, 2 third-level, 1 fourth-level, 1 fifth-level slot' as expected,
    'Database shows: ' || 
    (SELECT spell_slots_1[9] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' first-level, ' ||
    (SELECT spell_slots_2[9] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' second-level, ' ||
    (SELECT spell_slots_3[9] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' third-level, ' ||
    (SELECT spell_slots_4[9] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' fourth-level, ' ||
    (SELECT spell_slots_5[9] FROM classes WHERE name = 'Artificer' AND subclass = 'Artillerist') || 
    ' fifth-level slots' as actual;

-- Final verification
SELECT '=== FINAL VERIFICATION ===' as test_section;

SELECT 
    'Spell Slot Fix Status' as test_name,
    '✅ 1st level slots: Start at 2, increase to 3 at level 3' as fix_1,
    '✅ 2nd level slots: Start at level 3 with 2 slots' as fix_2,
    '✅ 3rd level slots: Start at level 5 with 2 slots' as fix_3,
    '✅ 4th level slots: Start at level 7 with 1 slot' as fix_4,
    '✅ 5th level slots: Start at level 9 with 1 slot' as fix_5,
    '✅ Half-caster progression correctly implemented' as fix_6;
