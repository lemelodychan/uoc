-- Add Warlock Genie class to the classes table
-- Based on D&D 5e Warlock class with Genie patron from Tasha's Cauldron of Everything

INSERT INTO classes (name, subclass, hit_die, primary_ability, saving_throw_proficiencies, spell_slots_1, spell_slots_2, spell_slots_3, spell_slots_4, spell_slots_5, spell_slots_6, spell_slots_7, spell_slots_8, spell_slots_9, cantrips_known, spells_known, bardic_inspiration_uses, class_features) VALUES
-- Warlock Genie
('Warlock', 'The Genie', 8, ARRAY['Charisma'], ARRAY['Wisdom', 'Charisma'],
 ARRAY[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], -- 1st level slots (Warlock Pact Magic - always 1 slot until level 2)
 ARRAY[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], -- 2nd level slots (Warlock gets 2nd level slots at level 3)
 ARRAY[0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], -- 3rd level slots (Warlock gets 3rd level slots at level 5)
 ARRAY[0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], -- 4th level slots (Warlock gets 4th level slots at level 7)
 ARRAY[0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1], -- 5th level slots (Warlock gets 5th level slots at level 9)
 ARRAY[0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1], -- 6th level slots (Warlock gets 6th level slots at level 11)
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1], -- 7th level slots (Warlock gets 7th level slots at level 13)
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1], -- 8th level slots (Warlock gets 8th level slots at level 15)
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1], -- 9th level slots (Warlock gets 9th level slots at level 17)
 ARRAY[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], -- Cantrips known (Warlocks get 2 cantrips at all levels)
 ARRAY[2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15], -- Spells known (Warlock spells known progression)
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No bardic inspiration
 '{"1": ["Otherworldly Patron", "Pact Magic"], "2": ["Eldritch Invocations"], "3": ["Pact Boon"], "4": ["Ability Score Improvement"], "5": [], "6": ["Otherworldly Patron Feature"], "7": [], "8": ["Ability Score Improvement"], "9": [], "10": ["Otherworldly Patron Feature"], "11": ["Mystic Arcanum (6th level)"], "12": ["Ability Score Improvement"], "13": ["Mystic Arcanum (7th level)"], "14": ["Otherworldly Patron Feature"], "15": ["Mystic Arcanum (8th level)"], "16": ["Ability Score Improvement"], "17": ["Mystic Arcanum (9th level)"], "18": [], "19": ["Ability Score Improvement"], "20": ["Eldritch Master"]}'::jsonb);

-- Get the class ID for the Warlock Genie
DO $$
DECLARE
    warlock_class_id UUID;
BEGIN
    -- Get the class ID
    SELECT id INTO warlock_class_id 
    FROM classes 
    WHERE name = 'Warlock' AND subclass = 'The Genie';
    
    IF warlock_class_id IS NOT NULL THEN
        RAISE NOTICE 'Warlock Genie class created with ID: %', warlock_class_id;
    ELSE
        RAISE NOTICE 'Failed to create Warlock Genie class';
    END IF;
END $$;

-- Verify the Warlock Genie class was created
SELECT 
    'Warlock Genie Class Verification' as test_name,
    name as class_name,
    subclass,
    hit_die,
    primary_ability,
    saving_throw_proficiencies,
    spell_slots_1[0] as level_1_slots,
    spell_slots_2[1] as level_2_slots,
    spell_slots_3[4] as level_5_slots,
    spell_slots_4[6] as level_7_slots,
    spell_slots_5[8] as level_9_slots,
    cantrips_known[0] as cantrips_at_level_1,
    spells_known[0] as spells_known_at_level_1,
    spells_known[9] as spells_known_at_level_10,
    spells_known[19] as spells_known_at_level_20
FROM classes 
WHERE name = 'Warlock' AND subclass = 'The Genie';
