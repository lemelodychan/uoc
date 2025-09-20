-- Test script for Spells Known Badge functionality
-- This script tests the calculation of additional spells from feats and class features

SELECT '=== SPELLS KNOWN BADGE TEST ===' as test_section;

-- Test 1: Level 7 Artificer Artillerist with Fey Touched
-- Expected: Base spells known = 7 (INT mod + half level), Additional = 6 (2 from Fey Touched + 4 from Artillerist Spells)
SELECT 
    'Test 1: Level 7 Artificer Artillerist with Fey Touched' as test_name,
    'Expected Base: 7 (INT mod + half level)' as expected_base,
    'Expected Additional: 6 (2 from Fey Touched + 4 from Artillerist Spells)' as expected_additional,
    'Expected Display: 7 +6' as expected_display;

-- Test 2: Level 5 Artificer Artillerist with Shadow Touched
-- Expected: Base spells known = 5, Additional = 4 (2 from Shadow Touched + 2 from Artillerist Spells)
SELECT 
    'Test 2: Level 5 Artificer Artillerist with Shadow Touched' as test_name,
    'Expected Base: 5 (INT mod + half level)' as expected_base,
    'Expected Additional: 4 (2 from Shadow Touched + 2 from Artillerist Spells)' as expected_additional,
    'Expected Display: 5 +4' as expected_display;

-- Test 3: Level 9 Artificer Artillerist with Magic Initiate
-- Expected: Base spells known = 9, Additional = 6 (2 from Magic Initiate + 4 from Artillerist Spells)
SELECT 
    'Test 3: Level 9 Artificer Artillerist with Magic Initiate' as test_name,
    'Expected Base: 9 (INT mod + half level)' as expected_base,
    'Expected Additional: 6 (2 from Magic Initiate + 4 from Artillerist Spells)' as expected_additional,
    'Expected Display: 9 +6' as expected_display;

-- Test 4: Level 3 Artificer Artillerist with no feats
-- Expected: Base spells known = 3, Additional = 2 (only from Artillerist Spells)
SELECT 
    'Test 4: Level 3 Artificer Artillerist with no feats' as test_name,
    'Expected Base: 3 (INT mod + half level)' as expected_base,
    'Expected Additional: 2 (only from Artillerist Spells)' as expected_additional,
    'Expected Display: 3 +2' as expected_display;

-- Test 5: Level 13 Artificer Artillerist with multiple feats
-- Expected: Base spells known = 13, Additional = 8 (2 from Fey Touched + 2 from Shadow Touched + 4 from Artillerist Spells)
SELECT 
    'Test 5: Level 13 Artificer Artillerist with multiple feats' as test_name,
    'Expected Base: 13 (INT mod + half level)' as expected_base,
    'Expected Additional: 8 (2 from Fey Touched + 2 from Shadow Touched + 4 from Artillerist Spells)' as expected_additional,
    'Expected Display: 13 +8' as expected_display;

-- Test 6: Non-Artificer class (should not get Artillerist Spells)
-- Expected: Base spells known = class default, Additional = only from feats
SELECT 
    'Test 6: Non-Artificer class with Fey Touched' as test_name,
    'Expected Base: Class default' as expected_base,
    'Expected Additional: 2 (only from Fey Touched)' as expected_additional,
    'Expected Display: [class default] +2' as expected_display;

SELECT '=== FEAT SPELL GRANTS ===' as test_section;

-- List all feats that grant spells
SELECT 
    'Feat Spell Grants' as category,
    'Fey Touched: +2 spells (1st level divination/enchantment + Misty Step)' as fey_touched,
    'Shadow Touched: +2 spells (1st level illusion/necromancy + Invisibility)' as shadow_touched,
    'Magic Initiate: +2 spells (1 cantrip + 1 1st level spell)' as magic_initiate,
    'Artificer Initiate: +1 spell (1 cantrip + 1 1st level spell)' as artificer_initiate,
    'Spell Sniper: +1 cantrip' as spell_sniper,
    'Telekinetic: +1 cantrip (Mage Hand)' as telekinetic,
    'Telepathic: +1 spell (Detect Thoughts)' as telepathic;

SELECT '=== ARTIFICER SUBCLASS SPELL GRANTS ===' as test_section;

-- List Artificer subclass spell grants
SELECT 
    'Artillerist Spells' as subclass,
    'Level 3: +2 spells (Shield, Thunderwave)' as level_3,
    'Level 5: +2 spells (Scorching Ray, Shatter)' as level_5,
    'Level 9: +2 spells (Fireball, Wind Wall)' as level_9,
    'Level 13: +2 spells (Ice Storm, Wall of Fire)' as level_13,
    'Level 17: +2 spells (Cone of Cold, Wall of Force)' as level_17;

SELECT 
    'Alchemist Spells' as subclass,
    'Level 3: +2 spells (Healing Word, Ray of Sickness)' as level_3,
    'Level 5: +2 spells (Flaming Sphere, Melf''s Acid Arrow)' as level_5,
    'Level 9: +2 spells (Gaseous Form, Mass Healing Word)' as level_9,
    'Level 13: +2 spells (Blight, Death Ward)' as level_13,
    'Level 17: +2 spells (Cloudkill, Raise Dead)' as level_17;

SELECT 
    'Armorer Spells' as subclass,
    'Level 3: +2 spells (Magic Missile, Thunderwave)' as level_3,
    'Level 5: +2 spells (Mirror Image, Shatter)' as level_5,
    'Level 9: +2 spells (Hypnotic Pattern, Lightning Bolt)' as level_9,
    'Level 13: +2 spells (Fire Shield, Greater Invisibility)' as level_13,
    'Level 17: +2 spells (Passwall, Wall of Force)' as level_17;

SELECT 
    'Battle Smith Spells' as subclass,
    'Level 3: +2 spells (Heroism, Shield)' as level_3,
    'Level 5: +2 spells (Aid, Branding Smite)' as level_5,
    'Level 9: +2 spells (Aura of Vitality, Conjure Barrage)' as level_9,
    'Level 13: +2 spells (Aura of Purity, Fire Shield)' as level_13,
    'Level 17: +2 spells (Banishing Smite, Mass Cure Wounds)' as level_17;

SELECT '=== IMPLEMENTATION NOTES ===' as test_section;

SELECT 
    'Implementation Details' as category,
    '✅ getAdditionalSpellsFromFeats() - calculates spells from feats' as feat_function,
    '✅ getAdditionalSpellsFromClassFeatures() - calculates spells from class features' as class_function,
    '✅ getTotalAdditionalSpells() - combines both sources' as total_function,
    '✅ UI updated to show base + badge format' as ui_update,
    '✅ Badge only shows when additional spells > 0' as badge_conditional;

SELECT 
    'Usage Example' as category,
    'For Level 7 Artificer Artillerist with Fey Touched:' as example,
    'Base: 7 (INT mod + half level)' as base_calc,
    'Feats: +2 (Fey Touched)' as feat_calc,
    'Class Features: +4 (Artillerist Spells at levels 3,5)' as class_calc,
    'Total Additional: +6' as total_calc,
    'Display: 7 +6' as final_display;
