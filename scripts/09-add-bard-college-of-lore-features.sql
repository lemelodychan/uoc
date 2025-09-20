-- Add Bard College of Lore features to the class_features table
-- First, get the class_id for Bard College of Lore
DO $$
DECLARE
    bard_lore_class_id UUID;
BEGIN
    -- Get the class_id for Bard College of Lore
    SELECT id INTO bard_lore_class_id 
    FROM classes 
    WHERE name = 'Bard' AND subclass = 'College of Lore';
    
    IF bard_lore_class_id IS NULL THEN
        RAISE EXCEPTION 'Bard College of Lore class not found';
    END IF;

    -- Insert Bard College of Lore features
    INSERT INTO class_features (class_id, level, title, description, feature_type) VALUES
    
    -- Level 1 Features
    (bard_lore_class_id, 1, 'Bardic Inspiration', 
     'You can inspire others through stirring words or music. To do so, you use a bonus action on your turn to choose one creature other than yourself within 60 feet of you who can hear you. That creature gains one Bardic Inspiration die, a d6. Once within the next 10 minutes, the creature can roll the die and add the number rolled to one ability check, attack roll, or saving throw it makes. The creature can wait until after it rolls the d20 before deciding to use the Bardic Inspiration die, but must decide before the DM says whether the roll succeeds or fails. Once the Bardic Inspiration die is rolled, it is lost. A creature can have only one Bardic Inspiration die at a time. You can use this feature a number of times equal to your Charisma modifier (a minimum of once). You regain any expended uses when you finish a long rest. Your Bardic Inspiration die changes when you reach certain levels in this class. The die becomes a d8 at 5th level, a d10 at 10th level, and a d12 at 15th level.', 
     'class'),
    
    (bard_lore_class_id, 1, 'Spellcasting', 
     'You have learned to untangle and reshape the fabric of reality in harmony with your wishes and music. Your spells are part of your vast repertoire, magic that you can tune to different situations. You know two cantrips of your choice from the bard spell list. You learn additional bard cantrips of your choice at higher levels, as shown in the Cantrips Known column of the Bard table. You know four 1st-level spells of your choice from the bard spell list. The Spells Known column of the Bard table shows when you learn more bard spells of your choice. Each of these spells must be of a level for which you have spell slots, as shown on the table. For instance, when you reach 3rd level in this class, you can learn one new spell of 1st or 2nd level. Additionally, when you gain a level in this class, you can choose one of the bard spells you know and replace it with another spell from the bard spell list, which also must be of a level for which you have spell slots. Charisma is your spellcasting ability for your bard spells. Your magic comes from the heart and soul you pour into the performance of your music or oration. You use your Charisma whenever a spell refers to your spellcasting ability. In addition, you use your Charisma modifier when setting the saving throw DC for a bard spell you cast and when making an attack roll with one. Spell save DC = 8 + your proficiency bonus + your Charisma modifier. Spell attack modifier = your proficiency bonus + your Charisma modifier. You can use a musical instrument as a spellcasting focus for your bard spells.', 
     'class'),
    
    -- Level 2 Features
    (bard_lore_class_id, 2, 'Jack of All Trades', 
     'Starting at 2nd level, you can add half your proficiency bonus, rounded down, to any ability check you make that doesn''t already include your proficiency bonus.', 
     'class'),
    
    (bard_lore_class_id, 2, 'Song of Rest', 
     'Beginning at 2nd level, you can use soothing music or oration to help revitalize your wounded allies during a short rest. If you or any friendly creatures who can hear your performance regain hit points at the end of the short rest by spending one or more Hit Dice, each of those creatures regains an extra 1d6 hit points. The extra hit points increase when you reach certain levels in this class: to 1d8 at 9th level, to 1d10 at 13th level, and to 1d12 at 17th level.', 
     'class'),
    
    -- Level 3 Features
    (bard_lore_class_id, 3, 'Expertise', 
     'At 3rd level, choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies. At 10th level, you can choose another two skill proficiencies to gain this benefit.', 
     'class'),
    
    (bard_lore_class_id, 3, 'College of Lore', 
     'Bards of the College of Lore know something about most things, collecting bits of knowledge from sources as diverse as scholarly tomes and peasant tales. Whether singing folk ballads in taverns or elaborate compositions in royal courts, these bards use their gifts to hold audiences spellbound. When the applause dies down, the audience members might find themselves questioning everything they held to be true, from their faith in the priesthood of the local temple to their loyalty to the king. The loyalty of these bards lies in the pursuit of beauty and truth, not in fealty to a monarch or following the tenets of a deity. A noble who keeps such a bard as a herald or advisor knows that the bard would rather be honest than politic. The college''s members gather in libraries and sometimes in actual colleges, complete with classrooms and dormitories, to share their lore with one another. They also meet at festivals or affairs of state, where they can expose corruption, unravel lies, and poke fun at self-important figures of authority.', 
     'subclass'),
    
    (bard_lore_class_id, 3, 'Bonus Proficiencies', 
     'When you join the College of Lore at 3rd level, you gain proficiency with three skills of your choice.', 
     'subclass'),
    
    (bard_lore_class_id, 3, 'Cutting Words', 
     'Also at 3rd level, you can use your reaction to expend one use of your Bardic Inspiration to reduce the damage dealt by an attack or ability check made by a creature you can see within 60 feet of you. The creature must be able to hear you. Roll your Bardic Inspiration die and reduce the damage by the number rolled. If the attack or ability check would deal no damage, the creature instead subtracts the number rolled from the attack roll or ability check.', 
     'subclass'),
    
    -- Level 4 Features
    (bard_lore_class_id, 4, 'Ability Score Improvement', 
     'When you reach 4th level, and again at 8th, 12th, 16th, and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 
     'class'),
    
    -- Level 5 Features
    (bard_lore_class_id, 5, 'Bardic Inspiration Improvement', 
     'At 5th level, your Bardic Inspiration die becomes a d8.', 
     'class'),
    
    (bard_lore_class_id, 5, 'Font of Inspiration', 
     'Beginning at 5th level, you regain all of your expended uses of Bardic Inspiration when you finish a short or long rest.', 
     'class'),
    
    -- Level 6 Features
    (bard_lore_class_id, 6, 'Countercharm', 
     'At 6th level, you gain the ability to use musical notes or words of power to disrupt mind-influencing effects. As an action, you can start a performance that lasts until the end of your next turn. During that time, you and any friendly creatures within 30 feet of you have advantage on saving throws against being frightened or charmed. A creature must be able to hear you to gain this benefit. The performance ends early if you are incapacitated or silenced or if you voluntarily end it (no action required).', 
     'class'),
    
    (bard_lore_class_id, 6, 'Additional Magical Secrets', 
     'At 6th level, you learn two spells of your choice from any class. A spell you choose must be of a level you can cast, as shown on the Bard table, or a cantrip. The chosen spells count as bard spells for you and are included in the number in the Spells Known column of the Bard table. You learn two additional spells from any class at 10th level and again at 14th level.', 
     'subclass'),
    
    -- Level 7 Features
    (bard_lore_class_id, 7, 'No New Features', 
     'You gain no new features at 7th level.', 
     'class'),
    
    -- Level 8 Features
    (bard_lore_class_id, 8, 'Ability Score Improvement', 
     'When you reach 8th level, and again at 12th, 16th, and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 
     'class'),
    
    -- Level 9 Features
    (bard_lore_class_id, 9, 'Song of Rest Improvement', 
     'At 9th level, the extra hit points from your Song of Rest feature increase to 1d8.', 
     'class'),
    
    -- Level 10 Features
    (bard_lore_class_id, 10, 'Bardic Inspiration Improvement', 
     'At 10th level, your Bardic Inspiration die becomes a d10.', 
     'class'),
    
    (bard_lore_class_id, 10, 'Expertise', 
     'At 10th level, choose two more of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.', 
     'class'),
    
    (bard_lore_class_id, 10, 'Magical Secrets', 
     'At 10th level, you have plundered magical knowledge from a wide spectrum of disciplines. Choose two spells from any class, including this one. A spell you choose must be of a level you can cast, as shown on the Bard table, or a cantrip. The chosen spells count as bard spells for you and are included in the number in the Spells Known column of the Bard table. You learn two additional spells from any class at 14th level and again at 18th level.', 
     'class'),
    
    -- Level 11 Features
    (bard_lore_class_id, 11, 'No New Features', 
     'You gain no new features at 11th level.', 
     'class'),
    
    -- Level 12 Features
    (bard_lore_class_id, 12, 'Ability Score Improvement', 
     'When you reach 12th level, and again at 16th and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 
     'class'),
    
    -- Level 13 Features
    (bard_lore_class_id, 13, 'Song of Rest Improvement', 
     'At 13th level, the extra hit points from your Song of Rest feature increase to 1d10.', 
     'class'),
    
    -- Level 14 Features
    (bard_lore_class_id, 14, 'Magical Secrets', 
     'At 14th level, you have plundered magical knowledge from a wide spectrum of disciplines. Choose two spells from any class, including this one. A spell you choose must be of a level you can cast, as shown on the Bard table, or a cantrip. The chosen spells count as bard spells for you and are included in the number in the Spells Known column of the Bard table. You learn two additional spells from any class at 18th level.', 
     'class'),
    
    (bard_lore_class_id, 14, 'Peerless Skill', 
     'Starting at 14th level, when you make an ability check, you can expend one use of Bardic Inspiration. Roll a Bardic Inspiration die and add the number rolled to your ability check. You can choose to do so after you roll the die for the ability check, but before the DM tells you whether you succeed or fail.', 
     'subclass'),
    
    -- Level 15 Features
    (bard_lore_class_id, 15, 'Bardic Inspiration Improvement', 
     'At 15th level, your Bardic Inspiration die becomes a d12.', 
     'class'),
    
    -- Level 16 Features
    (bard_lore_class_id, 16, 'Ability Score Improvement', 
     'When you reach 16th level, and again at 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 
     'class'),
    
    -- Level 17 Features
    (bard_lore_class_id, 17, 'Song of Rest Improvement', 
     'At 17th level, the extra hit points from your Song of Rest feature increase to 1d12.', 
     'class'),
    
    -- Level 18 Features
    (bard_lore_class_id, 18, 'Magical Secrets', 
     'At 18th level, you have plundered magical knowledge from a wide spectrum of disciplines. Choose two spells from any class, including this one. A spell you choose must be of a level you can cast, as shown on the Bard table, or a cantrip. The chosen spells count as bard spells for you and are included in the number in the Spells Known column of the Bard table.', 
     'class'),
    
    -- Level 19 Features
    (bard_lore_class_id, 19, 'Ability Score Improvement', 
     'When you reach 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 
     'class'),
    
    -- Level 20 Features
    (bard_lore_class_id, 20, 'Superior Inspiration', 
     'At 20th level, when you roll initiative and have no uses of Bardic Inspiration left, you regain one use.', 
     'class');

    RAISE NOTICE 'Successfully added Bard College of Lore features for class_id: %', bard_lore_class_id;
END $$;
