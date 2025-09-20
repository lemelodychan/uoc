-- Test script to verify Artificer Artillerist implementation
-- This script tests that the Artificer Artillerist class is properly configured

-- 1. Verify Artificer Artillerist class exists in classes table
SELECT '=== ARTIFICER ARTILLERIST CLASS VERIFICATION ===' as test_section;

SELECT 
    'Artificer Artillerist Class Data' as test_name,
    id,
    name,
    subclass,
    hit_die,
    primary_ability,
    saving_throw_proficiencies,
    spell_slots_1,
    spell_slots_2,
    spell_slots_3,
    spell_slots_4,
    spell_slots_5,
    cantrips_known,
    spells_known
FROM classes
WHERE name = 'Artificer' AND subclass = 'Artillerist';

-- 2. Verify Artificer Artillerist features exist
SELECT '=== ARTIFICER ARTILLERIST FEATURES VERIFICATION ===' as test_section;

SELECT 
    'Artificer Artillerist Features Count' as test_name,
    COUNT(*) as total_features
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Artificer' AND c.subclass = 'Artillerist';

-- 3. Test features by level
SELECT '=== FEATURES BY LEVEL ===' as test_section;

SELECT 
    'Level 1 Features' as test_name,
    cf.level,
    cf.title,
    cf.feature_type
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Artificer' 
  AND c.subclass = 'Artillerist'
  AND cf.level <= 1
ORDER BY cf.title;

SELECT 
    'Level 3 Features' as test_name,
    cf.level,
    cf.title,
    cf.feature_type
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Artificer' 
  AND c.subclass = 'Artillerist'
  AND cf.level <= 3
ORDER BY cf.level, cf.title;

SELECT 
    'Level 5 Features' as test_name,
    cf.level,
    cf.title,
    cf.feature_type
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Artificer' 
  AND c.subclass = 'Artillerist'
  AND cf.level <= 5
ORDER BY cf.level, cf.title;

-- 4. Test spell progression
SELECT '=== SPELL PROGRESSION TEST ===' as test_section;

-- Test what spell slots a level 5 Artificer would have
SELECT 
    'Level 5 Artificer Spell Slots' as test_name,
    spell_slots_1[5] as level_1_slots,
    spell_slots_2[5] as level_2_slots,
    spell_slots_3[5] as level_3_slots,
    spell_slots_4[5] as level_4_slots,
    spell_slots_5[5] as level_5_slots,
    cantrips_known[5] as cantrips,
    spells_known[5] as spells_prepared
FROM classes
WHERE name = 'Artificer' AND subclass = 'Artillerist';

-- Test what spell slots a level 10 Artificer would have
SELECT 
    'Level 10 Artificer Spell Slots' as test_name,
    spell_slots_1[10] as level_1_slots,
    spell_slots_2[10] as level_2_slots,
    spell_slots_3[10] as level_3_slots,
    spell_slots_4[10] as level_4_slots,
    spell_slots_5[10] as level_5_slots,
    cantrips_known[10] as cantrips,
    spells_known[10] as spells_prepared
FROM classes
WHERE name = 'Artificer' AND subclass = 'Artillerist';

-- 5. Test key Artillerist features
SELECT '=== KEY ARTILLERIST FEATURES ===' as test_section;

SELECT 
    'Eldritch Cannon Feature' as test_name,
    cf.level,
    cf.title,
    LEFT(cf.description, 100) || '...' as description_preview
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Artificer' 
  AND c.subclass = 'Artillerist'
  AND cf.title ILIKE '%eldritch cannon%';

SELECT 
    'Arcane Firearm Feature' as test_name,
    cf.level,
    cf.title,
    LEFT(cf.description, 100) || '...' as description_preview
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Artificer' 
  AND c.subclass = 'Artillerist'
  AND cf.title ILIKE '%arcane firearm%';

SELECT 
    'Artillerist Spells Feature' as test_name,
    cf.level,
    cf.title,
    LEFT(cf.description, 100) || '...' as description_preview
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Artificer' 
  AND c.subclass = 'Artillerist'
  AND cf.title ILIKE '%artillerist spells%';

-- 6. Verify no bardic inspiration (should be all zeros)
SELECT '=== BARDIC INSPIRATION VERIFICATION ===' as test_section;

SELECT 
    'Artificer Bardic Inspiration Check' as test_name,
    CASE 
        WHEN bardic_inspiration_uses = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] 
        THEN 'PASS: No bardic inspiration (correct for Artificer)'
        ELSE 'FAIL: Has bardic inspiration data (incorrect)'
    END as result
FROM classes
WHERE name = 'Artificer' AND subclass = 'Artillerist';

-- 7. Summary
SELECT '=== IMPLEMENTATION SUMMARY ===' as test_section;
SELECT 
    'Artificer Artillerist Implementation' as test_name,
    '1. Half-caster spell progression (up to 5th level spells)' as feature_1,
    '2. Intelligence-based spellcasting' as feature_2,
    '3. 2 cantrips known at all levels' as feature_3,
    '4. No spells known (prepares spells instead)' as feature_4,
    '5. No bardic inspiration (correct for Artificer)' as feature_5,
    '6. Key features: Magical Tinkering, Infuse Item, Eldritch Cannon, Arcane Firearm' as feature_6;
