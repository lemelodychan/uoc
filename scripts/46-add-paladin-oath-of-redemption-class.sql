-- Add Paladin Oath of Redemption class to the classes table
-- Paladin is a half-caster with Charisma as primary ability

INSERT INTO classes (name, subclass, hit_die, primary_ability, saving_throw_proficiencies, spell_slots_1, spell_slots_2, spell_slots_3, spell_slots_4, spell_slots_5, spell_slots_6, spell_slots_7, spell_slots_8, spell_slots_9, cantrips_known, spells_known, bardic_inspiration_uses, class_features) VALUES
-- Paladin Oath of Redemption
('Paladin', 'Oath of Redemption', 10, ARRAY['Charisma'], ARRAY['Wisdom', 'Charisma'],
 ARRAY[0,2,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4], -- 1st level slots (correct half-caster progression)
 ARRAY[0,0,0,0,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3], -- 2nd level slots
 ARRAY[0,0,0,0,0,0,0,0,2,2,3,3,3,3,3,3,3,3,3,3], -- 3rd level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,2,3,3,3,3], -- 4th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,2], -- 5th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- 6th level slots (Paladins don't get 6th+ level spells)
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- 7th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- 8th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- 9th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- Cantrips known (Paladins don't get cantrips)
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- Spells known (Paladins prepare spells, don't have spells known)
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No bardic inspiration
 '{"1": ["Divine Sense", "Lay on Hands"], "2": ["Fighting Style", "Spellcasting", "Divine Smite"], "3": ["Divine Health", "Sacred Oath"], "4": ["Ability Score Improvement"], "5": ["Extra Attack"], "6": ["Aura of Protection"], "7": ["Sacred Oath Feature"], "8": ["Ability Score Improvement"], "9": [], "10": ["Aura of Courage"], "11": ["Improved Divine Smite"], "12": ["Ability Score Improvement"], "13": [], "14": ["Cleansing Touch"], "15": ["Sacred Oath Feature"], "16": ["Ability Score Improvement"], "17": [], "18": ["Aura Improvements"], "19": ["Ability Score Improvement"], "20": ["Sacred Oath Feature"]}'::jsonb);

-- Get the class ID for the Paladin Oath of Redemption
DO $$
DECLARE
    paladin_class_id UUID;
BEGIN
    -- Get the class ID
    SELECT id INTO paladin_class_id FROM classes WHERE name = 'Paladin' AND subclass = 'Oath of Redemption';
    
    -- Insert class features for Paladin Oath of Redemption
    INSERT INTO class_features (class_id, level, title, description, feature_type) VALUES
    -- Level 1 Features
    (paladin_class_id, 1, 'Divine Sense', 'The presence of strong evil registers on your senses like a noxious odor, and powerful good rings like heavenly music in your ears. As an action, you can open your awareness to detect such forces. Until the end of your next turn, you know the location of any celestial, fiend, or undead within 60 feet of you that is not behind total cover. You know the type (celestial, fiend, or undead) of any being whose presence you sense, but not its identity (the vampire Count Strahd von Zarovich, for instance). Within the same radius, you also detect the presence of any place or object that has been consecrated or desecrated, as with the hallow spell. You can use this feature a number of times equal to 1 + your Charisma modifier. When you finish a long rest, you regain all expended uses.', 'class'),
    (paladin_class_id, 1, 'Lay on Hands', 'Your blessed touch can heal wounds. You have a pool of healing power that replenishes when you take a long rest. With that pool, you can restore a total number of hit points equal to your paladin level × 5. As an action, you can touch a creature and draw power from the pool to restore a number of hit points to that creature, up to the maximum amount remaining in your pool. Alternatively, you can expend 5 hit points from your pool of healing to cure the target of one disease or neutralize one poison affecting it. You can cure multiple diseases and neutralize multiple poisons with a single use of Lay on Hands, expending hit points separately for each one. This feature has no effect on undead and constructs.', 'class'),
    
    -- Level 2 Features
    (paladin_class_id, 2, 'Fighting Style', 'You adopt a particular style of fighting as your specialty. Choose one of the following options. You can''t take a Fighting Style option more than once, even if you later get to choose again.', 'class'),
    (paladin_class_id, 2, 'Spellcasting', 'You have learned to draw on divine magic through meditation and prayer to cast spells as a cleric does. See chapter 10 for the general rules of spellcasting and chapter 11 for the paladin spell list.', 'class'),
    (paladin_class_id, 2, 'Divine Smite', 'When you hit a creature with a melee weapon attack, you can expend one spell slot to deal radiant damage to the target, in addition to the weapon''s damage. The extra damage is 2d8 for a 1st-level spell slot, plus 1d8 for each spell level higher than 1st, to a maximum of 5d8. The damage increases by 1d8 if the target is an undead or a fiend, to a maximum of 6d8.', 'class'),
    
    -- Level 3 Features
    (paladin_class_id, 3, 'Divine Health', 'The divine magic flowing through you makes you immune to disease.', 'class'),
    (paladin_class_id, 3, 'Sacred Oath', 'When you reach 3rd level, you swear the oath that binds you as a paladin forever. Up to this time you have been in a preparatory stage, committed to the path but not yet sworn to it. Your choice grants you features at 3rd level and again at 7th, 15th, and 20th level. Those features include oath spells and the Channel Divinity feature.', 'class'),
    (paladin_class_id, 3, 'Oath Spells', 'You gain oath spells at the paladin levels listed in the Oath of Redemption Spells table. See the Sacred Oath class feature for how oath spells work.', 'subclass'),
    (paladin_class_id, 3, 'Channel Divinity', 'When you take this oath at 3rd level, you gain the following two Channel Divinity options.', 'subclass'),
    (paladin_class_id, 3, 'Emissary of Peace', 'You can use your Channel Divinity to augment your presence with divine power. As a bonus action, you grant yourself a +5 bonus to Charisma (Persuasion) checks for the next 10 minutes.', 'subclass'),
    (paladin_class_id, 3, 'Rebuke the Violent', 'You can use your Channel Divinity to rebuke those who use violence. Immediately after a creature within 30 feet of you deals damage with an attack against a creature other than you, you can use your reaction to force the attacker to make a Wisdom saving throw. On a failed save, the attacker takes radiant damage equal to the damage it just dealt. On a successful save, it takes half as much damage.', 'subclass'),
    
    -- Level 4 Features
    (paladin_class_id, 4, 'Ability Score Improvement', 'When you reach 4th level, and again at 8th, 12th, 16th, and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 'class'),
    
    -- Level 5 Features
    (paladin_class_id, 5, 'Extra Attack', 'Beginning at 5th level, you can attack twice, instead of once, whenever you take the Attack action on your turn.', 'class'),
    
    -- Level 6 Features
    (paladin_class_id, 6, 'Aura of Protection', 'Starting at 6th level, whenever you or a friendly creature within 10 feet of you must make a saving throw, the creature gains a bonus to the saving throw equal to your Charisma modifier (with a minimum bonus of +1). You must be conscious to grant this bonus. At 18th level, the range of this aura increases to 30 feet.', 'class'),
    
    -- Level 7 Features
    (paladin_class_id, 7, 'Aura of the Guardian', 'You can shield others from harm at the cost of your own health. When a creature within 10 feet of you takes damage, you can use your reaction to magically take that damage, instead of that creature taking it. This feature doesn''t transfer any other effects that might accompany the damage, and this damage can''t be reduced in any way. At 18th level, the range of this aura increases to 30 feet.', 'subclass'),
    
    -- Level 8 Features
    (paladin_class_id, 8, 'Ability Score Improvement', 'When you reach 4th level, and again at 8th, 12th, 16th, and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 'class'),
    
    -- Level 9 Features
    (paladin_class_id, 9, 'Oath Spells', 'You gain oath spells at the paladin levels listed in the Oath of Redemption Spells table. See the Sacred Oath class feature for how oath spells work.', 'subclass'),
    
    -- Level 10 Features
    (paladin_class_id, 10, 'Aura of Courage', 'Starting at 10th level, you and friendly creatures within 10 feet of you can''t be frightened while you are conscious. At 18th level, the range of this aura increases to 30 feet.', 'class'),
    
    -- Level 11 Features
    (paladin_class_id, 11, 'Improved Divine Smite', 'By 11th level, you are so suffused with righteous might that all your melee weapon strikes carry divine power with them. Whenever you hit a creature with a melee weapon, the creature takes an extra 1d8 radiant damage. If you also use your Divine Smite with an attack, you add this damage to the extra damage of your Divine Smite.', 'class'),
    
    -- Level 12 Features
    (paladin_class_id, 12, 'Ability Score Improvement', 'When you reach 4th level, and again at 8th, 12th, 16th, and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 'class'),
    
    -- Level 13 Features
    (paladin_class_id, 13, 'Oath Spells', 'You gain oath spells at the paladin levels listed in the Oath of Redemption Spells table. See the Sacred Oath class feature for how oath spells work.', 'subclass'),
    
    -- Level 14 Features
    (paladin_class_id, 14, 'Cleansing Touch', 'Beginning at 14th level, you can use your action to end one spell on yourself or on one willing creature that you touch. You can use this feature a number of times equal to your Charisma modifier (a minimum of once). You regain expended uses when you finish a long rest.', 'class'),
    
    -- Level 15 Features
    (paladin_class_id, 15, 'Protective Spirit', 'Beginning at 15th level, a holy presence mends your wounds in battle. You regain hit points equal to 1d6 + half your paladin level if you end your turn in combat with fewer than half of your hit points remaining and you aren''t incapacitated.', 'subclass'),
    
    -- Level 16 Features
    (paladin_class_id, 16, 'Ability Score Improvement', 'When you reach 4th level, and again at 8th, 12th, 16th, and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 'class'),
    
    -- Level 17 Features
    (paladin_class_id, 17, 'Oath Spells', 'You gain oath spells at the paladin levels listed in the Oath of Redemption Spells table. See the Sacred Oath class feature for how oath spells work.', 'subclass'),
    
    -- Level 18 Features
    (paladin_class_id, 18, 'Aura Improvements', 'At 18th level, the range of your auras increases to 30 feet.', 'class'),
    
    -- Level 19 Features
    (paladin_class_id, 19, 'Ability Score Improvement', 'When you reach 4th level, and again at 8th, 12th, 16th, and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 'class'),
    
    -- Level 20 Features
    (paladin_class_id, 20, 'Emissary of Redemption', 'At 20th level, you become an avatar of peace, which gives you two benefits: You have resistance to all damage dealt by other creatures (their attacks, spells, and other effects). Whenever a creature hits you with an attack, it takes radiant damage equal to half the damage you take from the attack. If you attack a creature, cast a spell on it, or deal damage to it by any means, neither benefit works against that creature until you finish a long rest.', 'subclass');
    
    RAISE NOTICE 'Paladin Oath of Redemption class and features added successfully. Class ID: %', paladin_class_id;
END $$;
