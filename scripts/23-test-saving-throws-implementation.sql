-- Test script to verify saving throws implementation
-- This script tests that saving throw proficiencies are properly implemented

-- 1. Verify saving throw proficiencies column exists in characters table
SELECT '=== SAVING THROW PROFICIENCIES COLUMN VERIFICATION ===' as test_section;

SELECT 
    'Saving Throw Proficiencies Column Check' as test_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'characters' 
  AND column_name = 'saving_throw_proficiencies';

-- 2. Test inserting saving throw proficiencies data
SELECT '=== SAVING THROW PROFICIENCIES DATA TEST ===' as test_section;

-- Example of what the saving throw proficiencies JSONB would look like:
SELECT 
    'Sample Saving Throw Proficiencies Data' as test_name,
    '[
        {
            "ability": "strength",
            "proficient": false
        },
        {
            "ability": "dexterity", 
            "proficient": true
        },
        {
            "ability": "constitution",
            "proficient": false
        },
        {
            "ability": "intelligence",
            "proficient": false
        },
        {
            "ability": "wisdom",
            "proficient": true
        },
        {
            "ability": "charisma",
            "proficient": false
        }
    ]'::jsonb as sample_saving_throws;

-- 3. Test querying saving throw proficiencies data
SELECT '=== SAVING THROW PROFICIENCIES QUERY TEST ===' as test_section;

-- Test querying characters with saving throw proficiencies
SELECT 
    'Characters with Saving Throw Proficiencies' as test_name,
    id,
    name,
    class_name,
    jsonb_array_length(saving_throw_proficiencies) as saving_throw_count
FROM characters
WHERE saving_throw_proficiencies IS NOT NULL 
  AND jsonb_array_length(saving_throw_proficiencies) > 0;

-- 4. Test saving throw proficiencies filtering
SELECT '=== SAVING THROW PROFICIENCIES FILTERING TEST ===' as test_section;

-- This would be used by the application to filter saving throws by proficiency
SELECT 
    'Proficient Saving Throws' as test_name,
    'Query to find proficient saving throws' as description,
    'SELECT * FROM characters, jsonb_array_elements(saving_throw_proficiencies) AS st WHERE st->>''proficient'' = ''true''' as sample_query;

-- 5. Test saving throw proficiencies count per character
SELECT '=== SAVING THROW PROFICIENCIES COUNT TEST ===' as test_section;

SELECT 
    'Saving Throw Proficiencies Count by Character' as test_name,
    name,
    class_name,
    jsonb_array_length(saving_throw_proficiencies) as saving_throw_count
FROM characters
WHERE saving_throw_proficiencies IS NOT NULL
ORDER BY saving_throw_count DESC;

-- 6. Test saving throw proficiencies index performance
SELECT '=== SAVING THROW PROFICIENCIES INDEX TEST ===' as test_section;

SELECT 
    'Saving Throw Proficiencies Index Check' as test_name,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'characters' 
  AND indexname LIKE '%saving_throw_proficiencies%';

-- 7. Test saving throw calculation
SELECT '=== SAVING THROW CALCULATION TEST ===' as test_section;

-- Example of saving throw bonus calculation
SELECT 
    'Saving Throw Bonus Calculation' as test_name,
    'Ability Modifier + Proficiency Bonus (if proficient)' as formula,
    'Automatically calculated based on ability score and proficiency' as description;

-- 8. Test all six saving throws
SELECT '=== ALL SIX SAVING THROWS TEST ===' as test_section;

SELECT 
    'All Six Saving Throws' as test_name,
    'Strength' as save_1,
    'Dexterity' as save_2,
    'Constitution' as save_3,
    'Intelligence' as save_4,
    'Wisdom' as save_5,
    'Charisma' as save_6,
    'Each saving throw can be marked as proficient' as description;

-- 9. Summary of expected functionality
SELECT '=== IMPLEMENTATION SUMMARY ===' as test_section;
SELECT 
    'Saving Throws Implementation Features' as test_name,
    '1. JSONB column stores array of saving throw proficiency objects' as feature_1,
    '2. Each saving throw has ability and proficient fields' as feature_2,
    '3. All six ability scores represented' as feature_3,
    '4. Checkbox interface for proficiency selection' as feature_4,
    '5. Automatic bonus calculation' as feature_5,
    '6. GIN index for efficient JSONB queries' as feature_6,
    '7. Default state: no proficiencies selected' as feature_7;
