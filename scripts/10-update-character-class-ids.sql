-- Update existing characters to have proper class_id relationships
-- This script ensures all characters have the correct class_id based on their class_name and subclass

-- Update characters with Bard College of Lore
UPDATE characters 
SET class_id = (SELECT id FROM classes WHERE name = 'Bard' AND subclass = 'College of Lore')
WHERE class_name = 'Bard' AND subclass = 'College of Lore' AND class_id IS NULL;

-- Update characters with Wizard School of Evocation
UPDATE characters 
SET class_id = (SELECT id FROM classes WHERE name = 'Wizard' AND subclass = 'School of Evocation')
WHERE class_name = 'Wizard' AND subclass = 'School of Evocation' AND class_id IS NULL;

-- Update characters with other classes (without subclass for now)
UPDATE characters 
SET class_id = (SELECT id FROM classes WHERE name = characters.class_name AND subclass IS NULL)
WHERE class_id IS NULL AND class_name IS NOT NULL;

-- Show the results
SELECT 
    c.name as character_name,
    c.class_name,
    c.subclass,
    c.level,
    cl.id as class_id,
    cl.name as class_table_name,
    cl.subclass as class_table_subclass
FROM characters c
LEFT JOIN classes cl ON c.class_id = cl.id
ORDER BY c.name;
