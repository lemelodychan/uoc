-- Add Artificer Artillerist class to the classes table
-- Artificer is a half-caster with Intelligence as primary ability

INSERT INTO classes (name, subclass, hit_die, primary_ability, saving_throw_proficiencies, spell_slots_1, spell_slots_2, spell_slots_3, spell_slots_4, spell_slots_5, spell_slots_6, spell_slots_7, spell_slots_8, spell_slots_9, cantrips_known, spells_known, bardic_inspiration_uses, class_features) VALUES
-- Artificer Artillerist
('Artificer', 'Artillerist', 8, ARRAY['Intelligence'], ARRAY['Constitution', 'Intelligence'],
 ARRAY[2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3], -- 1st level slots (half-caster progression)
 ARRAY[0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], -- 2nd level slots
 ARRAY[0,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], -- 3rd level slots
 ARRAY[0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1], -- 4th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1], -- 5th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- 6th level slots (Artificers don't get 6th+ level spells)
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- 7th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- 8th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- 9th level slots
 ARRAY[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2], -- Cantrips known (Artificers get 2 cantrips at all levels)
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- Spells known (Artificers prepare spells, don't have spells known)
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No bardic inspiration
 '{"1": ["Magical Tinkering", "Spellcasting"], "2": ["Infuse Item"], "3": ["The Right Tool for the Job", "Artillerist Spells", "Eldritch Cannon"], "4": ["Ability Score Improvement"], "5": ["Arcane Firearm"], "6": ["Tool Expertise"], "7": ["Flash of Genius"], "8": ["Ability Score Improvement"], "9": ["Explosive Cannon"], "10": ["Magic Item Adept"], "11": ["Spell-Storing Item"], "12": ["Ability Score Improvement"], "13": [], "14": ["Magic Item Savant"], "15": ["Fortified Position"], "16": ["Ability Score Improvement"], "17": [], "18": ["Magic Item Master"], "19": ["Ability Score Improvement"], "20": ["Soul of Artifice"]}'::jsonb);
