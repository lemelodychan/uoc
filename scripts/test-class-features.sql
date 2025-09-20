-- Test script to verify class features are working correctly
-- This script can be run to test the class features functionality

-- 1. Check if the class_features table exists and has data
SELECT 'Class Features Table Check' as test_name;
SELECT COUNT(*) as total_features FROM class_features;

-- 2. Check Bard College of Lore features specifically
SELECT 'Bard College of Lore Features' as test_name;
SELECT 
    cf.level,
    cf.title,
    cf.feature_type,
    LEFT(cf.description, 100) || '...' as description_preview
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Bard' AND c.subclass = 'College of Lore'
ORDER BY cf.level, cf.title;

-- 3. Test getting features for a specific level (e.g., level 3 Bard)
SELECT 'Level 3 Bard Features' as test_name;
SELECT 
    cf.level,
    cf.title,
    cf.feature_type
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Bard' 
  AND c.subclass = 'College of Lore'
  AND cf.level <= 3
ORDER BY cf.level, cf.title;

-- 4. Check if any characters exist and their class relationships
SELECT 'Character Class Relationships' as test_name;
SELECT 
    c.name as character_name,
    c.class_name,
    c.subclass,
    c.level,
    cl.id as class_id,
    CASE 
        WHEN cl.id IS NOT NULL THEN 'Has class_id'
        ELSE 'Missing class_id'
    END as class_relationship_status
FROM characters c
LEFT JOIN classes cl ON c.class_id = cl.id
ORDER BY c.name;

-- 5. Test the exact query that would be used by the application
SELECT 'Application Query Test' as test_name;
-- This simulates what loadClassFeatures would do for a level 6 Bard
SELECT 
    cf.id,
    cf.class_id,
    cf.level,
    cf.title,
    cf.description,
    cf.feature_type
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Bard' 
  AND c.subclass = 'College of Lore'
  AND cf.level <= 6
ORDER BY cf.level, cf.title;
