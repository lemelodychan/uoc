-- Add Artificer Artillerist features to the class_features table
-- First, get the class_id for Artificer Artillerist
DO $$
DECLARE
    artificer_artillerist_class_id UUID;
BEGIN
    -- Get the class_id for Artificer Artillerist
    SELECT id INTO artificer_artillerist_class_id 
    FROM classes 
    WHERE name = 'Artificer' AND subclass = 'Artillerist';
    
    IF artificer_artillerist_class_id IS NULL THEN
        RAISE EXCEPTION 'Artificer Artillerist class not found';
    END IF;

    -- Insert Artificer Artillerist features
    INSERT INTO class_features (class_id, level, title, description, feature_type) VALUES
    
    -- Level 1 Features
    (artificer_artillerist_class_id, 1, 'Magical Tinkering', 
     'You learn how to invest a spark of magic into mundane objects. To use this ability, you must have thieves'' tools or artisan''s tools in hand. You touch a Tiny nonmagical object as an action and give it one of the following magical properties of your choice: The object sheds bright light in a 5-foot radius and dim light for an additional 5 feet. Whenever tapped by a creature, the object emits a recorded message that can be heard up to 10 feet away. You utter the message when you bestow this property on the object, and the recording can be no more than 6 seconds long. The object continuously emits your choice of an odor or a nonverbal sound (wind, waves, chirping, or the like). The chosen phenomenon is perceivable up to 10 feet away. A static visual effect appears on one of the object''s surfaces. This effect can be a picture, up to 25 words of text, lines and shapes, or a mixture of these elements, as you like. The chosen property lasts indefinitely. As an action, you can touch the object and end the property early. You can bestow magic on multiple objects, touching one object each time you use this feature, though a single object can only bear one property at a time. The maximum number of objects you can affect with this feature at one time is equal to your Intelligence modifier (minimum of one object). If you try to exceed your maximum, the oldest property immediately ends, and then the new property applies.', 
     'class'),
    
    (artificer_artillerist_class_id, 1, 'Spellcasting', 
     'You have studied the workings of magic and how to cast spells, channeling the magic through objects. To observers, you don''t appear to be casting spells in a conventional way; you appear to produce wonders from mundane items and outlandish inventions. Intelligence is your spellcasting ability for your artificer spells; your understanding of the theory behind magic allows you to wield these spells with superior skill. You use your Intelligence whenever a spell refers to your spellcasting ability. In addition, you use your Intelligence modifier when setting the saving throw DC for an artificer spell you cast and when making an attack roll with one. Spell save DC = 8 + your proficiency bonus + your Intelligence modifier. Spell attack modifier = your proficiency bonus + your Intelligence modifier. You can cast an artificer spell as a ritual if that spell has the ritual tag and you have the spell prepared.', 
     'class'),
    
    -- Level 2 Features
    (artificer_artillerist_class_id, 2, 'Infuse Item', 
     'You''ve gained the ability to imbue mundane items with certain magical infusions, turning those objects into magic items. Whenever you finish a long rest, you can touch a nonmagical object and imbue it with one of your artificer infusions, turning it into a magic item. An infusion works on only certain kinds of objects, as specified in the infusion''s description. If the item requires attunement, you can attune yourself to it the instant you infuse the item. If you decide to attune to the item later, you must do so using the normal process for attunement. Your infusion remains in an item indefinitely, but when you die, the infusion vanishes after a number of days equal to your Intelligence modifier (minimum of 1 day). The infusion also vanishes if you replace your knowledge of the infusion. You can infuse more than one nonmagical object at the end of a long rest; the maximum number of objects appears in the Infused Items column of the Artificer table. You must touch each of the objects, and each of your infusions can be in only one object at a time. Moreover, no object can bear more than one of your infusions at a time. If you try to exceed your maximum number of infusions, the oldest infusion immediately ends, and then the new infusion applies.', 
     'class'),
    
    -- Level 3 Features
    (artificer_artillerist_class_id, 3, 'The Right Tool for the Job', 
     'You''ve learned how to produce exactly the tool you need: with thieves'' tools or artisan''s tools in hand, you can magically create one set of artisan''s tools in an unoccupied space within 5 feet of you. This creation requires 1 hour of uninterrupted work, which can coincide with a short or long rest. Though the product of magic, the tools are nonmagical, and they vanish when you use this feature again.', 
     'class'),
    
    (artificer_artillerist_class_id, 3, 'Artillerist Spells', 
     'You always have certain spells prepared after you reach particular levels in this class, as shown in the Artillerist Spells table. These spells count as artificer spells for you, but they don''t count against the number of artificer spells you prepare. 3rd Level: Shield, Thunderwave. 5th Level: Scorching Ray, Shatter. 9th Level: Fireball, Wind Wall. 13th Level: Ice Storm, Wall of Fire. 17th Level: Cone of Cold, Wall of Force.', 
     'subclass'),
    
    (artificer_artillerist_class_id, 3, 'Eldritch Cannon', 
     'You''ve learned how to create a magical cannon. Using woodcarver''s tools or smith''s tools, you can take an action to magically create a Small or Tiny eldritch cannon in an unoccupied space on a horizontal surface within 5 feet of you. A Small eldritch cannon occupies its space, and a Tiny one can be held in one hand. Once you create a cannon, you can''t do so again until you finish a long rest or until you expend a spell slot of 1st level or higher to create one. You can have only one cannon at a time and can''t create one while your cannon is present. The cannon is a magical object. Regardless of size, the cannon is an object with AC 18 and a number of hit points equal to five times your artificer level. It is immune to poison damage and psychic damage. If it is forced to make an ability check or a saving throw, treat all its ability scores as 10 (+0). If the mending spell is cast on it, it regains 2d6 hit points. It disappears if it is reduced to 0 hit points or after 1 hour. You can dismiss it early as an action. When you create the cannon, you determine its appearance and whether it has legs. You can make the cannon look however you like, but its appearance has no effect on its functionality. As an action, you can command the cannon to walk or climb up to 15 feet to an unoccupied space, provided it has legs. The cannon is a ranged weapon, and you can make a ranged spell attack with it. The cannon''s attack bonus equals your proficiency bonus + your Intelligence modifier. On a hit, the cannon deals force damage equal to 1d8 + your Intelligence modifier. The cannon also has a special property that depends on its form, chosen when you create it. Flamethrower: The cannon exhales fire in an adjacent 15-foot cone that you designate. Each creature in that area must make a Dexterity saving throw against your spell save DC, taking 1d8 fire damage on a failed save or half as much damage on a successful one. The fire ignites any flammable objects in the area that aren''t being worn or carried. Force Ballista: Make a ranged spell attack, originating from the cannon, at one creature or object within 120 feet of it. On a hit, the target takes 1d8 force damage, and if the target is a creature, it is pushed up to 5 feet away from the cannon in a direction you choose. Protector: The cannon emits a burst of positive energy that grants itself and each creature of your choice within 10 feet of it a number of temporary hit points equal to 1d8 + your Intelligence modifier (minimum of +1).', 
     'subclass'),
    
    -- Level 4 Features
    (artificer_artillerist_class_id, 4, 'Ability Score Improvement', 
     'When you reach 4th level, and again at 8th, 12th, 16th, and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 
     'class'),
    
    -- Level 5 Features
    (artificer_artillerist_class_id, 5, 'Arcane Firearm', 
     'You know how to turn a wand, staff, or rod into an arcane firearm, a conduit for your destructive spells. When you finish a long rest, you can use woodcarver''s tools to carve special sigils into a wand, staff, or rod and thereby turn it into your arcane firearm. The sigils disappear from the object if it no longer serves as your arcane firearm. The sigils otherwise last indefinitely. You can use your arcane firearm as a spellcasting focus for your artificer spells. When you cast an artificer spell through the firearm, roll a d8, and you gain a bonus to one of the spell''s damage rolls equal to the number rolled.', 
     'subclass'),
    
    -- Level 6 Features
    (artificer_artillerist_class_id, 6, 'Tool Expertise', 
     'Your proficiency bonus is now doubled for any ability check you make that uses your proficiency with a tool.', 
     'class'),
    
    -- Level 7 Features
    (artificer_artillerist_class_id, 7, 'Flash of Genius', 
     'You gain the ability to come up with solutions under pressure. When you or another creature you can see within 30 feet of you makes an ability check or a saving throw, you can use your reaction to add your Intelligence modifier to the roll. You can use this feature a number of times equal to your Intelligence modifier (minimum of once). You regain all expended uses when you finish a long rest.', 
     'class'),
    
    -- Level 8 Features
    (artificer_artillerist_class_id, 8, 'Ability Score Improvement', 
     'When you reach 8th level, and again at 12th, 16th, and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 
     'class'),
    
    -- Level 9 Features
    (artificer_artillerist_class_id, 9, 'Explosive Cannon', 
     'Your eldritch cannon now explodes when destroyed. When the cannon is reduced to 0 hit points, it explodes. Each creature within 10 feet of it must make a Dexterity saving throw against your spell save DC, taking 2d8 force damage on a failed save or half as much damage on a successful one. The explosion ignites flammable objects in that area that aren''t being worn or carried. In addition, when you create the cannon, you can choose the damage type: acid, cold, fire, lightning, poison, or thunder.', 
     'subclass'),
    
    -- Level 10 Features
    (artificer_artillerist_class_id, 10, 'Magic Item Adept', 
     'You can attune to up to four magic items at once.', 
     'class'),
    
    -- Level 11 Features
    (artificer_artillerist_class_id, 11, 'Spell-Storing Item', 
     'You can now store a spell in an object. Whenever you finish a long rest, you can touch one simple or martial weapon or one item that you can use as a spellcasting focus, and you store a spell in it, choosing a 1st- or 2nd-level artificer spell that you have prepared. The spell has no effect, other than to be stored in the object. If the item is a weapon, the spell is discharged the next time you hit with it. If the item is anything else, the spell is discharged the next time you or someone else uses the item. When the spell is discharged, the object is no longer magical. The spell uses your spellcasting ability modifier and spell save DC. You can''t store a spell in an object that already has a spell stored in it, and you can''t store a spell in an object that''s already magical.', 
     'class'),
    
    -- Level 12 Features
    (artificer_artillerist_class_id, 12, 'Ability Score Improvement', 
     'When you reach 12th level, and again at 16th and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 
     'class'),
    
    -- Level 13 Features
    (artificer_artillerist_class_id, 13, 'No New Features', 
     'You gain no new features at 13th level.', 
     'class'),
    
    -- Level 14 Features
    (artificer_artillerist_class_id, 14, 'Magic Item Savant', 
     'You can attune to up to five magic items at once. You ignore all class, race, spell, and level requirements on attuning to or using a magic item.', 
     'class'),
    
    -- Level 15 Features
    (artificer_artillerist_class_id, 15, 'Fortified Position', 
     'You''re a master at defending a particular spot. This mastery has the following benefits: You can have two eldritch cannons at the same time. You can create both of them with the same action (but not the same spell slot), and you can dismiss both with the same action. You can direct both cannons to activate when you command your cannons to activate, and you can direct both to move (no action required) when you command your cannons to move. Whenever you or a creature you can see moves into a space within 10 feet of one of your cannons, the cannon can make an opportunity attack against that creature using its reaction.', 
     'subclass'),
    
    -- Level 16 Features
    (artificer_artillerist_class_id, 16, 'Ability Score Improvement', 
     'When you reach 16th level, and again at 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 
     'class'),
    
    -- Level 17 Features
    (artificer_artillerist_class_id, 17, 'No New Features', 
     'You gain no new features at 17th level.', 
     'class'),
    
    -- Level 18 Features
    (artificer_artillerist_class_id, 18, 'Magic Item Master', 
     'You can attune to up to six magic items at once.', 
     'class'),
    
    -- Level 19 Features
    (artificer_artillerist_class_id, 19, 'Ability Score Improvement', 
     'When you reach 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. As normal, you can''t increase an ability score above 20 using this feature.', 
     'class'),
    
    -- Level 20 Features
    (artificer_artillerist_class_id, 20, 'Soul of Artifice', 
     'You develop a mystical connection to your magic items, which you can draw on for protection: You gain a +1 bonus to all saving throws per magic item you are currently attuned to. If you''re reduced to 0 hit points but not killed outright, you can use your reaction to end one of your artificer infusions, causing you to drop to 1 hit point instead of 0.', 
     'class');

    RAISE NOTICE 'Successfully added Artificer Artillerist features for class_id: %', artificer_artillerist_class_id;
END $$;
