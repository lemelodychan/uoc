-- Test script to verify Warlock class features are properly inserted
-- This script checks if the Warlock Genie class and its features exist in the database

-- 1. Check if Warlock Genie class exists
SELECT 
    'Warlock Genie Class Check' as test_name,
    id,
    name,
    subclass,
    hit_die,
    primary_ability,
    saving_throw_proficiencies
FROM classes 
WHERE name = 'Warlock' AND subclass = 'The Genie';

-- 2. Check if Warlock class features exist
SELECT 
    'Warlock Class Features Check' as test_name,
    cf.id,
    cf.class_id,
    cf.level,
    cf.title,
    cf.description,
    cf.feature_type,
    c.name as class_name,
    c.subclass
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Warlock' AND c.subclass = 'The Genie'
ORDER BY cf.level, cf.name;

-- 3. Count total Warlock features by level
SELECT 
    'Warlock Features Count by Level' as test_name,
    cf.level,
    COUNT(*) as feature_count,
    STRING_AGG(cf.title, ', ') as features
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Warlock' AND c.subclass = 'The Genie'
GROUP BY cf.level
ORDER BY cf.level;

-- 4. Check if any characters exist with Warlock class
SELECT 
    'Warlock Characters Check' as test_name,
    id,
    name,
    class_name,
    subclass,
    class_id,
    level
FROM characters 
WHERE class_name = 'Warlock' AND subclass = 'The Genie';

-- 5. Test the loadClassFeatures function equivalent
SELECT 
    'Test loadClassFeatures for Warlock' as test_name,
    cf.id,
    cf.level,
    cf.title,
    cf.description,
    cf.feature_type
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Warlock' 
  AND c.subclass = 'The Genie'
  AND cf.level <= 5  -- Test for level 5 character
ORDER BY cf.level, cf.title;
