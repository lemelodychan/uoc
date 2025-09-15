-- Create classes table with subclasses, spell slot progression, and class features
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subclass TEXT,
  hit_die INTEGER NOT NULL DEFAULT 8,
  primary_ability TEXT[],
  saving_throw_proficiencies TEXT[],
  
  -- Spell slot progression (max slots per level for each spell level)
  spell_slots_1 INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- levels 1-20
  spell_slots_2 INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  spell_slots_3 INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  spell_slots_4 INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  spell_slots_5 INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  spell_slots_6 INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  spell_slots_7 INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  spell_slots_8 INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  spell_slots_9 INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  
  -- Cantrips known progression
  cantrips_known INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  
  -- Spells known progression (for classes that know limited spells)
  spells_known INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  
  -- Class features by level (JSONB for flexibility)
  class_features JSONB DEFAULT '{}',
  
  -- Bardic inspiration progression (for bards)
  bardic_inspiration_uses INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  bardic_inspiration_die TEXT[] DEFAULT ARRAY['d6','d6','d6','d6','d8','d8','d8','d8','d8','d10','d10','d10','d10','d10','d12','d12','d12','d12','d12','d12'],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read classes (they're reference data)
CREATE POLICY "Classes are viewable by everyone" ON classes
  FOR SELECT USING (true);

-- Only allow authenticated users to insert/update classes (for admin purposes)
CREATE POLICY "Only authenticated users can modify classes" ON classes
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_classes_name ON classes(name);
CREATE INDEX idx_classes_name_subclass ON classes(name, subclass);

-- Insert basic D&D 5e classes with spell progressions
INSERT INTO classes (name, subclass, hit_die, primary_ability, saving_throw_proficiencies, spell_slots_1, spell_slots_2, spell_slots_3, spell_slots_4, spell_slots_5, spell_slots_6, spell_slots_7, spell_slots_8, spell_slots_9, cantrips_known, spells_known, bardic_inspiration_uses, class_features) VALUES
-- Bard
('Bard', 'College of Lore', 8, ARRAY['Charisma'], ARRAY['Dexterity', 'Charisma'], 
 ARRAY[2,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4], -- 1st level slots
 ARRAY[0,0,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3], -- 2nd level slots
 ARRAY[0,0,0,0,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3], -- 3rd level slots
 ARRAY[0,0,0,0,0,0,1,2,3,3,3,3,3,3,3,3,3,3,3,3], -- 4th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,1,2,3,3,3,3,3,3,3,3,3], -- 5th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,2,2,2], -- 6th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,2,2], -- 7th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,2], -- 8th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1], -- 9th level slots
 ARRAY[2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4], -- Cantrips known
 ARRAY[4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22], -- Spells known
 ARRAY[2,2,3,3,3,3,3,3,3,3,3,4,4,4,4,4,4,5,5,5], -- Bardic inspiration uses
 '{"1": ["Bardic Inspiration", "Spellcasting"], "2": ["Jack of All Trades", "Song of Rest"], "3": ["Expertise", "College Feature"], "4": ["Ability Score Improvement"], "5": ["Bardic Inspiration Improvement", "Font of Inspiration"], "6": ["Countercharm", "College Feature"], "7": [], "8": ["Ability Score Improvement"], "9": ["Song of Rest Improvement"], "10": ["Bardic Inspiration Improvement", "Expertise", "Magical Secrets"], "11": [], "12": ["Ability Score Improvement"], "13": ["Song of Rest Improvement"], "14": ["College Feature", "Magical Secrets"], "15": ["Bardic Inspiration Improvement"], "16": ["Ability Score Improvement"], "17": ["Song of Rest Improvement"], "18": ["Magical Secrets"], "19": ["Ability Score Improvement"], "20": ["Superior Inspiration"]}'::jsonb),

-- Wizard
('Wizard', 'School of Evocation', 6, ARRAY['Intelligence'], ARRAY['Intelligence', 'Wisdom'],
 ARRAY[2,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4], -- 1st level slots
 ARRAY[0,0,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3], -- 2nd level slots
 ARRAY[0,0,0,0,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3], -- 3rd level slots
 ARRAY[0,0,0,0,0,0,1,2,3,3,3,3,3,3,3,3,3,3,3,3], -- 4th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,1,2,3,3,3,3,3,3,3,3,3], -- 5th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,2,2,2], -- 6th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,2,2], -- 7th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,2], -- 8th level slots
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1], -- 9th level slots
 ARRAY[3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5], -- Cantrips known
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- Spells known (wizards prepare spells)
 ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], -- No bardic inspiration
 '{"1": ["Spellcasting", "Arcane Recovery"], "2": ["Arcane Tradition"], "3": [], "4": ["Ability Score Improvement"], "5": [], "6": ["Arcane Tradition Feature"], "7": [], "8": ["Ability Score Improvement"], "9": [], "10": ["Arcane Tradition Feature"], "11": [], "12": ["Ability Score Improvement"], "13": [], "14": ["Arcane Tradition Feature"], "15": [], "16": ["Ability Score Improvement"], "17": [], "18": ["Spell Mastery"], "19": ["Ability Score Improvement"], "20": ["Signature Spells"]}'::jsonb);

-- Add more classes as needed...
