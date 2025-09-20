-- Add Warlock Genie class features to the class_features table
-- Based on D&D 5e Warlock class with Genie patron from Tasha's Cauldron of Everything

-- First, get the Warlock Genie class ID
DO $$
DECLARE
    warlock_class_id UUID;
BEGIN
    -- Get the class ID for Warlock Genie
    SELECT id INTO warlock_class_id 
    FROM classes 
    WHERE name = 'Warlock' AND subclass = 'The Genie';
    
    IF warlock_class_id IS NULL THEN
        RAISE EXCEPTION 'Warlock Genie class not found. Please run script 59-add-warlock-genie-class.sql first.';
    END IF;

    -- Insert Warlock base class features
    INSERT INTO class_features (class_id, level, name, description, source) VALUES
    -- Level 1: Otherworldly Patron (Genie)
    (warlock_class_id, 1, 'Otherworldly Patron', 
     'You have struck a bargain with an otherworldly being of your choice. Your choice grants you features at 1st level and again at 6th, 10th, and 14th level. The Genie patron grants you access to elemental magic and the power to grant wishes.', 
     'base'),
    
    -- Level 1: Pact Magic
    (warlock_class_id, 1, 'Pact Magic', 
     'Your arcane research and the magic bestowed on you by your patron have given you facility with spells. You know two 1st-level spells of your choice from the warlock spell list. You learn an additional warlock spell of your choice at each level except 12th, 14th, 16th, 18th, 19th, and 20th. Your spell slots are always cast at the highest level available to you. You regain all expended spell slots when you finish a short or long rest.', 
     'base'),
    
    -- Level 2: Eldritch Invocations
    (warlock_class_id, 2, 'Eldritch Invocations', 
     'In your study of occult lore, you have unearthed Eldritch Invocations, fragments of forbidden knowledge that imbue you with an abiding magical ability. At 2nd level, you gain two eldritch invocations of your choice. When you gain certain warlock levels, you gain additional invocations of your choice.', 
     'base'),
    
    -- Level 3: Pact Boon
    (warlock_class_id, 3, 'Pact Boon', 
     'Your otherworldly patron bestows a gift upon you for your loyal service. You gain one of the following features of your choice: Pact of the Blade, Pact of the Chain, Pact of the Tome, or Pact of the Talisman.', 
     'base'),
    
    -- Level 4: Ability Score Improvement
    (warlock_class_id, 4, 'Ability Score Improvement', 
     'When you reach 4th level, and again at 8th, 12th, 16th, and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 
     'base'),
    
    -- Level 6: Genie Wrath
    (warlock_class_id, 6, 'Genie Wrath', 
     'Once during each of your turns when you hit with an attack roll, you can deal extra damage to the target equal to your proficiency bonus. The type of this damage is determined by your patron: bludgeoning (dao), cold (djinni), fire (efreeti), or thunder (marid).', 
     'subclass'),
    
    -- Level 6: Elemental Gift
    (warlock_class_id, 6, 'Elemental Gift', 
     'You begin to take on characteristics of your patron''s kind. You now have resistance to a damage type determined by your patron''s kind: bludgeoning (dao), cold (djinni), fire (efreeti), or thunder (marid). In addition, as a bonus action, you can give yourself a flying speed of 30 feet that lasts for 10 minutes, during which you can hover. You can use this bonus action a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.', 
     'subclass'),
    
    -- Level 10: Sanctuary Vessel
    (warlock_class_id, 10, 'Sanctuary Vessel', 
     'Your patron''s power has manifested itself as an object that you can use as a focus for your eldritch magic. This object is a Tiny vessel, and it is a spellcasting focus for your warlock spells. You decide what the object looks like, or you can determine what it is randomly by rolling on the Genie''s Vessel table. As a bonus action, you can magically vanish and enter your vessel, which remains in the space you left. The interior of the vessel is an extradimensional space in the shape of a 20-foot-radius cylinder, 20 feet high, and resembles your patron''s domain. The interior is appointed with cushions and low tables and is a comfortable temperature. While inside, you can hear the area around your vessel as if you were in its space. You can remain inside the vessel up to a number of hours equal to twice your proficiency bonus. You exit the vessel early if you use a bonus action to leave, if you die, or if the vessel is destroyed. When you exit the vessel, you appear in the unoccupied space closest to it. Any objects left in the vessel remain there until carried out, and if the vessel is destroyed, every object stored there harmlessly appears in the unoccupied spaces closest to the vessel''s former space. Once you enter the vessel, you can''t enter again until you finish a long rest.', 
     'subclass'),
    
    -- Level 11: Mystic Arcanum (6th level)
    (warlock_class_id, 11, 'Mystic Arcanum (6th level)', 
     'Your patron bestows upon you a magical secret called an arcanum. Choose one 6th-level spell from the warlock spell list as this arcanum. You can cast your arcanum spell once without expending a spell slot. You must finish a long rest before you can do so again.', 
     'base'),
    
    -- Level 14: Limited Wish
    (warlock_class_id, 14, 'Limited Wish', 
     'You entreat your patron to grant you a small wish. As an action, you can speak your desire to your Genie''s Vessel, requesting the effect of one spell that is 6th level or lower and has a casting time of 1 action. The spell can be from any class''s spell list, and you don''t need to meet the requirements in that spell, including costly components. The spell simply takes effect as part of this action. Once you use this feature, you can''t use it again until you finish 1d4 long rests.', 
     'subclass'),
    
    -- Level 15: Mystic Arcanum (8th level)
    (warlock_class_id, 15, 'Mystic Arcanum (8th level)', 
     'Your patron bestows upon you a magical secret called an arcanum. Choose one 8th-level spell from the warlock spell list as this arcanum. You can cast your arcanum spell once without expending a spell slot. You must finish a long rest before you can do so again.', 
     'base'),
    
    -- Level 17: Mystic Arcanum (9th level)
    (warlock_class_id, 17, 'Mystic Arcanum (9th level)', 
     'Your patron bestows upon you a magical secret called an arcanum. Choose one 9th-level spell from the warlock spell list as this arcanum. You can cast your arcanum spell once without expending a spell slot. You must finish a long rest before you can do so again.', 
     'base'),
    
    -- Level 20: Eldritch Master
    (warlock_class_id, 20, 'Eldritch Master', 
     'You can draw on your inner reserve of mystical power while entreating your patron to regain expended spell slots. You can spend 1 minute entreating your patron for aid to regain all your expended spell slots from your Pact Magic feature. Once you regain spell slots with this feature, you must finish a long rest before you can do so again.', 
     'base');

    RAISE NOTICE 'Warlock Genie class features added successfully for class ID: %', warlock_class_id;
END $$;

-- Verify the class features were added
SELECT 
    'Warlock Genie Class Features Verification' as test_name,
    cf.level,
    cf.name,
    cf.source,
    c.name as class_name,
    c.subclass
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Warlock' AND c.subclass = 'The Genie'
ORDER BY cf.level, cf.name;
