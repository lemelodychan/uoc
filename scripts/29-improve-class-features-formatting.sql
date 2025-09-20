-- Improve class features formatting for better readability
-- This script updates class features descriptions with better formatting using markdown-like syntax

-- Update Bard College of Lore features with improved formatting
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

    -- Update Bardic Inspiration with better formatting
    UPDATE class_features 
    SET description = 'You can inspire others through stirring words or music.

**How to use:**
- Use a bonus action on your turn
- Choose one creature other than yourself within 60 feet who can hear you
- That creature gains one Bardic Inspiration die (d6)

**How it works:**
- Within the next 10 minutes, the creature can roll the die and add the number to one ability check, attack roll, or saving throw
- The creature can wait until after rolling the d20 before deciding to use the die
- Must decide before the DM says whether the roll succeeds or fails
- Once rolled, the die is lost
- A creature can have only one Bardic Inspiration die at a time

**Uses:** Number of times equal to your Charisma modifier (minimum of once)
**Recovery:** Regain expended uses when you finish a long rest

**Die progression:**
- 1st-4th level: d6
- 5th-9th level: d8
- 10th-14th level: d10
- 15th+ level: d12'
    WHERE class_id = bard_lore_class_id AND title = 'Bardic Inspiration';

    -- Update Spellcasting with better formatting
    UPDATE class_features 
    SET description = 'You have learned to untangle and reshape the fabric of reality in harmony with your wishes and music.

**Cantrips Known:**
- You know two cantrips of your choice from the bard spell list
- Learn additional bard cantrips at higher levels (see Cantrips Known column)

**Spells Known:**
- You know four 1st-level spells of your choice from the bard spell list
- Learn more bard spells as shown in the Spells Known column
- Each spell must be of a level for which you have spell slots
- When you gain a level, you can replace one known spell with another from the bard spell list

**Spellcasting Ability:** Charisma
- Your magic comes from the heart and soul you pour into performance
- Use Charisma for spell attack rolls and saving throw DCs

**Spell Save DC:** 8 + your proficiency bonus + your Charisma modifier
**Spell Attack Modifier:** your proficiency bonus + your Charisma modifier

**Spellcasting Focus:** You can use a musical instrument as a spellcasting focus'
    WHERE class_id = bard_lore_class_id AND title = 'Spellcasting';

    -- Update Jack of All Trades with better formatting
    UPDATE class_features 
    SET description = 'Starting at 2nd level, you can add half your proficiency bonus, rounded down, to any ability check you make that doesn''t already include your proficiency bonus.'
    WHERE class_id = bard_lore_class_id AND title = 'Jack of All Trades';

    -- Update Song of Rest with better formatting
    UPDATE class_features 
    SET description = 'Beginning at 2nd level, you can use soothing music or oration to help revitalize your wounded allies during a short rest.

**How it works:**
- If you or any friendly creatures who can hear your performance regain hit points at the end of a short rest by spending Hit Dice
- Each of those creatures regains extra hit points

**Extra hit points progression:**
- 2nd-8th level: 1d6
- 9th-12th level: 1d8
- 13th-16th level: 1d10
- 17th+ level: 1d12'
    WHERE class_id = bard_lore_class_id AND title = 'Song of Rest';

    -- Update Expertise with better formatting
    UPDATE class_features 
    SET description = 'At 3rd level, choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.

**Additional Expertise:** At 10th level, you can choose another two skill proficiencies to gain this benefit.'
    WHERE class_id = bard_lore_class_id AND title = 'Expertise';

    -- Update College of Lore with better formatting
    UPDATE class_features 
    SET description = 'Bards of the College of Lore know something about most things, collecting bits of knowledge from sources as diverse as scholarly tomes and peasant tales.

**Philosophy:**
- Whether singing folk ballads in taverns or elaborate compositions in royal courts, these bards use their gifts to hold audiences spellbound
- When the applause dies down, the audience members might find themselves questioning everything they held to be true
- The loyalty of these bards lies in the pursuit of beauty and truth, not in fealty to a monarch or following the tenets of a deity

**Gathering Places:**
- Libraries and sometimes actual colleges, complete with classrooms and dormitories
- Festivals or affairs of state, where they can expose corruption, unravel lies, and poke fun at self-important figures of authority'
    WHERE class_id = bard_lore_class_id AND title = 'College of Lore';

    -- Update Bonus Proficiencies with better formatting
    UPDATE class_features 
    SET description = 'When you join the College of Lore at 3rd level, you gain proficiency with three skills of your choice.'
    WHERE class_id = bard_lore_class_id AND title = 'Bonus Proficiencies';

    -- Update Cutting Words with better formatting
    UPDATE class_features 
    SET description = 'Also at 3rd level, you can use your reaction to expend one use of your Bardic Inspiration to reduce a creature''s attack roll, ability check, or damage roll by the number rolled on the Bardic Inspiration die.

**How to use:**
- Use your reaction when a creature within 60 feet of you makes an attack roll, ability check, or damage roll
- Expend one use of your Bardic Inspiration
- The creature must be able to hear you
- Reduce the roll by the number rolled on the Bardic Inspiration die

**Limitations:**
- You can use this feature before or after the roll is made
- You must decide before the DM says whether the roll succeeds or fails'
    WHERE class_id = bard_lore_class_id AND title = 'Cutting Words';

    -- Update Additional Magical Secrets with better formatting
    UPDATE class_features 
    SET description = 'At 6th level, you learn two spells of your choice from any class. A spell you choose must be of a level you can cast, as shown on the Bard table, or a cantrip.

**Spell Selection:**
- Choose from any class''s spell list
- Must be of a level you can cast or a cantrip
- The chosen spells count as bard spells for you
- They don''t count against the number of bard spells you know

**Additional Learning:** At 10th level, you learn two more spells from any class using the same rules.'
    WHERE class_id = bard_lore_class_id AND title = 'Additional Magical Secrets';

END $$;

-- Update Artificer Artillerist features with improved formatting
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

    -- Update Magical Tinkering with better formatting
    UPDATE class_features 
    SET description = 'You learn how to invest a spark of magic into mundane objects.

**Requirements:** You must have thieves'' tools or artisan''s tools in hand

**How to use:**
- Touch a Tiny nonmagical object as an action
- Give it one of the following magical properties of your choice:

**Available Properties:**
- **Light:** The object sheds bright light in a 5-foot radius and dim light for an additional 5 feet
- **Message:** Whenever tapped by a creature, the object emits a recorded message that can be heard up to 10 feet away (up to 6 seconds long)
- **Sensory Effect:** The object continuously emits your choice of an odor or a nonverbal sound (wind, waves, chirping, etc.) perceivable up to 10 feet away
- **Visual Effect:** A static visual effect appears on one of the object''s surfaces (picture, up to 25 words of text, lines and shapes, or mixture)

**Duration:** The chosen property lasts indefinitely
**Ending:** As an action, you can touch the object and end the property early

**Limitations:**
- You can bestow magic on multiple objects, touching one object each time you use this feature
- A single object can only bear one property at a time
- Maximum number of objects = your Intelligence modifier (minimum of one object)
- If you try to exceed your maximum, the oldest property immediately ends'
    WHERE class_id = artificer_artillerist_class_id AND title = 'Magical Tinkering';

    -- Update Spellcasting with better formatting
    UPDATE class_features 
    SET description = 'You have studied the workings of magic and how to cast spells, channeling the magic through objects.

**Unique Casting Style:**
- To observers, you don''t appear to be casting spells in a conventional way
- You appear to produce wonders from mundane items and outlandish inventions

**Spellcasting Ability:** Intelligence
- Your understanding of the theory behind magic allows you to wield these spells with superior skill
- Use Intelligence for spell attack rolls and saving throw DCs

**Spell Save DC:** 8 + your proficiency bonus + your Intelligence modifier
**Spell Attack Modifier:** your proficiency bonus + your Intelligence modifier

**Ritual Casting:** You can cast an artificer spell as a ritual if that spell has the ritual tag and you have the spell prepared'
    WHERE class_id = artificer_artillerist_class_id AND title = 'Spellcasting';

    -- Update Infuse Item with better formatting
    UPDATE class_features 
    SET description = 'You''ve gained the ability to imbue mundane items with certain magical infusions, turning those objects into magic items.

**How to use:**
- Whenever you finish a long rest, you can touch a nonmagical object
- Imbue it with one of your artificer infusions, turning it into a magic item
- An infusion works on only certain kinds of objects, as specified in the infusion''s description

**Attunement:**
- If the item requires attunement, you can attune yourself to it the instant you infuse the item
- If you decide to attune to the item later, you must do so using the normal process for attunement

**Duration:**
- Your infusion remains in an item indefinitely
- When you die, the infusion vanishes after a number of days equal to your Intelligence modifier (minimum of 1 day)
- The infusion also vanishes if you replace your knowledge of the infusion

**Limitations:**
- You can infuse more than one nonmagical object at the end of a long rest (see Infused Items column)
- You must touch each of the objects
- Each of your infusions can be in only one object at a time
- No object can bear more than one of your infusions at a time
- If you try to exceed your maximum number of infusions, the oldest infusion immediately ends'
    WHERE class_id = artificer_artillerist_class_id AND title = 'Infuse Item';

    -- Update The Right Tool for the Job with better formatting
    UPDATE class_features 
    SET description = 'You''ve learned how to produce exactly the tool you need.

**How to use:**
- With thieves'' tools or artisan''s tools in hand
- You can magically create one set of artisan''s tools in an unoccupied space within 5 feet of you

**Creation Process:**
- Requires 1 hour of uninterrupted work
- Can coincide with a short or long rest

**Result:**
- Though the product of magic, the tools are nonmagical
- They vanish when you use this feature again'
    WHERE class_id = artificer_artillerist_class_id AND title = 'The Right Tool for the Job';

    -- Update Artillerist Spells with better formatting
    UPDATE class_features 
    SET description = 'You always have certain spells prepared after you reach particular levels in this class.

**Spell Preparation:**
- These spells count as artificer spells for you
- They don''t count against the number of artificer spells you prepare

**Spells by Level:**
- **3rd Level:** Shield, Thunderwave
- **5th Level:** Scorching Ray, Shatter
- **9th Level:** Fireball, Wind Wall
- **13th Level:** Ice Storm, Wall of Fire
- **17th Level:** Cone of Cold, Wall of Force'
    WHERE class_id = artificer_artillerist_class_id AND title = 'Artillerist Spells';

    -- Update Eldritch Cannon with better formatting
    UPDATE class_features 
    SET description = 'You''ve learned how to create a magical cannon.

**Creation:**
- Using woodcarver''s tools or smith''s tools
- Take an action to magically create a Small or Tiny eldritch cannon
- Place it in an unoccupied space on a horizontal surface within 5 feet of you

**Cannon Properties:**
- **Small:** Occupies its space
- **Tiny:** Can be held in one hand
- **AC:** 18
- **Hit Points:** Five times your artificer level
- **Immunities:** Poison damage and psychic damage
- **Ability Scores:** All treated as 10 (+0) for checks and saves

**Maintenance:**
- If the mending spell is cast on it, it regains 2d6 hit points
- Disappears if reduced to 0 hit points or after 1 hour
- You can dismiss it early as an action

**Limitations:**
- Once you create a cannon, you can''t do so again until you finish a long rest or expend a spell slot of 1st level or higher
- You can have only one cannon at a time
- Can''t create one while your cannon is present

**Movement:**
- As an action, you can command the cannon to walk or climb up to 15 feet to an unoccupied space (if it has legs)

**Combat:**
- The cannon is a ranged weapon
- Make a ranged spell attack with it
- Attack bonus = your proficiency bonus + your Intelligence modifier
- On a hit, deals force damage equal to 1d8 + your Intelligence modifier

**Cannon Forms (choose when creating):**
- **Flamethrower:** Exhales fire in an adjacent 15-foot cone. Each creature in that area must make a Dexterity saving throw against your spell save DC, taking 1d8 fire damage on a failed save or half as much on a successful one. The fire ignites any flammable objects in the area that aren''t being worn or carried.
- **Force Ballista:** Make a ranged spell attack at one creature or object within 120 feet. On a hit, the target takes 1d8 force damage, and if the target is a creature, it is pushed up to 5 feet away from the cannon in a direction you choose.
- **Protector:** Emits a burst of positive energy that grants itself and each creature of your choice within 10 feet of it a number of temporary hit points equal to 1d8 + your Intelligence modifier (minimum of +1).'
    WHERE class_id = artificer_artillerist_class_id AND title = 'Eldritch Cannon';

    -- Update Ability Score Improvement with better formatting
    UPDATE class_features 
    SET description = 'When you reach 4th level, and again at 8th, 12th, 16th, and 19th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.

**Limitation:** As normal, you can''t increase an ability score above 20 using this feature.'
    WHERE class_id = artificer_artillerist_class_id AND title = 'Ability Score Improvement';

    -- Update Arcane Firearm with better formatting
    UPDATE class_features 
    SET description = 'You know how to turn a wand, staff, or rod into an arcane firearm, a conduit for your destructive spells.

**Creation:**
- When you finish a long rest, you can use woodcarver''s tools to carve special sigils into a wand, staff, or rod
- This turns it into your arcane firearm
- The sigils disappear from the object if it no longer serves as your arcane firearm
- The sigils otherwise last indefinitely

**Usage:**
- You can use your arcane firearm as a spellcasting focus for your artificer spells
- When you cast an artificer spell through the firearm, roll a d8
- You gain a bonus to one of the spell''s damage rolls equal to the number rolled'
    WHERE class_id = artificer_artillerist_class_id AND title = 'Arcane Firearm';

    -- Update Tool Expertise with better formatting
    UPDATE class_features 
    SET description = 'Your proficiency bonus is now doubled for any ability check you make that uses your proficiency with a tool.'
    WHERE class_id = artificer_artillerist_class_id AND title = 'Tool Expertise';

END $$;

-- Verify the updates
SELECT '=== FORMATTING IMPROVEMENTS COMPLETE ===' as status;

SELECT 
    'Bard College of Lore Features Updated' as class_features,
    COUNT(*) as total_features
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Bard' AND c.subclass = 'College of Lore';

SELECT 
    'Artificer Artillerist Features Updated' as class_features,
    COUNT(*) as total_features
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Artificer' AND c.subclass = 'Artillerist';

-- Show a sample of the improved formatting
SELECT 
    'Sample Improved Formatting' as sample,
    cf.title,
    LEFT(cf.description, 200) || '...' as description_preview
FROM class_features cf
JOIN classes c ON cf.class_id = c.id
WHERE c.name = 'Bard' AND cf.title = 'Bardic Inspiration'
LIMIT 1;
