-- Test script to verify Song of Rest display functionality
-- This script tests that Song of Rest is properly configured for Bard characters

-- 1. Verify Bard class has Song of Rest features in the class_features table
SELECT '=== SONG OF REST FEATURES VERIFICATION ===' as test_section;

SELECT 
    'Bard Song of Rest Features' as test_name,
    cf.level,
    cf.title,
    cf.feature_type,
    LEFT(cf.description, 100) || '...' as description_preview
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Bard' 
  AND c.subclass = 'College of Lore'
  AND cf.title ILIKE '%song of rest%'
ORDER BY cf.level;

-- 2. Test what Song of Rest features a Bard would get at different levels
SELECT '=== SONG OF REST BY LEVEL ===' as test_section;

-- Level 1 Bard (should not have Song of Rest)
SELECT 
    'Level 1 Bard Features' as test_name,
    cf.level,
    cf.title
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Bard' 
  AND c.subclass = 'College of Lore'
  AND cf.level <= 1
  AND cf.title ILIKE '%song of rest%';

-- Level 2 Bard (should have Song of Rest)
SELECT 
    'Level 2 Bard Features' as test_name,
    cf.level,
    cf.title,
    cf.description
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Bard' 
  AND c.subclass = 'College of Lore'
  AND cf.level <= 2
  AND cf.title ILIKE '%song of rest%';

-- Level 9 Bard (should have Song of Rest with d8 healing)
SELECT 
    'Level 9 Bard Features' as test_name,
    cf.level,
    cf.title,
    cf.description
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Bard' 
  AND c.subclass = 'College of Lore'
  AND cf.level <= 9
  AND cf.title ILIKE '%song of rest%';

-- 3. Verify that non-Bard classes don't have Song of Rest features
SELECT '=== NON-BARD CLASSES VERIFICATION ===' as test_section;

SELECT 
    'Non-Bard Classes Song of Rest Check' as test_name,
    c.name as class_name,
    c.subclass,
    COUNT(cf.id) as song_of_rest_features
FROM classes c
LEFT JOIN class_features cf ON c.id = cf.class_id 
    AND cf.title ILIKE '%song of rest%'
WHERE c.name != 'Bard'
GROUP BY c.name, c.subclass
ORDER BY c.name, c.subclass;

-- 4. Summary of expected behavior
SELECT '=== EXPECTED BEHAVIOR SUMMARY ===' as test_section;
SELECT 
    'Song of Rest Display Rules' as test_name,
    '1. Only appears for Bard characters' as rule_1,
    '2. Available starting at level 2' as rule_2,
    '3. Healing die progression: d6 (2-8), d8 (9-12), d10 (13-16), d12 (17-20)' as rule_3,
    '4. Displayed under Bardic Inspiration section' as rule_4,
    '5. Clickable to toggle Available/Used status' as rule_5;
