-- Verify that Bardic Inspiration and Song of Rest are properly isolated to Bard class only
-- This script tests that non-Bard classes don't have bardic inspiration data

-- 1. Check that all classes have bardic inspiration data (should be 0 for non-Bards)
SELECT 'All Classes Bardic Inspiration Data' as test_name;
SELECT 
    name,
    subclass,
    bardic_inspiration_uses,
    bardic_inspiration_die
FROM classes
ORDER BY name, subclass;

-- 2. Verify that only Bard classes have non-zero bardic inspiration uses
SELECT 'Non-Zero Bardic Inspiration Check' as test_name;
SELECT 
    name,
    subclass,
    bardic_inspiration_uses
FROM classes
WHERE bardic_inspiration_uses != ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

-- 3. Check that Bard classes have proper bardic inspiration progression
SELECT 'Bard Bardic Inspiration Progression' as test_name;
SELECT 
    name,
    subclass,
    bardic_inspiration_uses,
    bardic_inspiration_die
FROM classes
WHERE name = 'Bard';

-- 4. Verify that Wizard (and other non-Bard classes) have zero bardic inspiration
SELECT 'Non-Bard Classes Bardic Inspiration' as test_name;
SELECT 
    name,
    subclass,
    CASE 
        WHEN bardic_inspiration_uses = ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] 
        THEN 'CORRECT: No bardic inspiration'
        ELSE 'ERROR: Has bardic inspiration data'
    END as bardic_inspiration_status
FROM classes
WHERE name != 'Bard';

-- 5. Test the exact data that would be returned for a Wizard character
SELECT 'Wizard Class Data Test' as test_name;
SELECT 
    id,
    name,
    subclass,
    bardic_inspiration_uses,
    bardic_inspiration_die
FROM classes
WHERE name = 'Wizard' AND subclass = 'School of Evocation';
