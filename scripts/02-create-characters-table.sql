-- Create characters table with all individual character data
CREATE TABLE IF NOT EXISTS characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic character info
  name TEXT NOT NULL DEFAULT 'New Character',
  class_name TEXT NOT NULL DEFAULT 'Fighter',
  subclass TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  race TEXT NOT NULL DEFAULT 'Human',
  background TEXT NOT NULL DEFAULT 'Folk Hero',
  alignment TEXT NOT NULL DEFAULT 'Neutral',
  experience_points INTEGER NOT NULL DEFAULT 0,
  
  -- Ability scores
  strength INTEGER NOT NULL DEFAULT 10,
  dexterity INTEGER NOT NULL DEFAULT 10,
  constitution INTEGER NOT NULL DEFAULT 10,
  intelligence INTEGER NOT NULL DEFAULT 10,
  wisdom INTEGER NOT NULL DEFAULT 10,
  charisma INTEGER NOT NULL DEFAULT 10,
  
  -- Combat stats
  armor_class INTEGER NOT NULL DEFAULT 10,
  hit_points INTEGER NOT NULL DEFAULT 8,
  max_hit_points INTEGER NOT NULL DEFAULT 8,
  temporary_hit_points INTEGER NOT NULL DEFAULT 0,
  speed INTEGER NOT NULL DEFAULT 30,
  
  -- Skills (JSONB for flexibility with proficiency and expertise)
  skills JSONB DEFAULT '{
    "acrobatics": {"proficient": false, "expertise": false, "modifier": 0},
    "animal_handling": {"proficient": false, "expertise": false, "modifier": 0},
    "arcana": {"proficient": false, "expertise": false, "modifier": 0},
    "athletics": {"proficient": false, "expertise": false, "modifier": 0},
    "deception": {"proficient": false, "expertise": false, "modifier": 0},
    "history": {"proficient": false, "expertise": false, "modifier": 0},
    "insight": {"proficient": false, "expertise": false, "modifier": 0},
    "intimidation": {"proficient": false, "expertise": false, "modifier": 0},
    "investigation": {"proficient": false, "expertise": false, "modifier": 0},
    "medicine": {"proficient": false, "expertise": false, "modifier": 0},
    "nature": {"proficient": false, "expertise": false, "modifier": 0},
    "perception": {"proficient": false, "expertise": false, "modifier": 0},
    "performance": {"proficient": false, "expertise": false, "modifier": 0},
    "persuasion": {"proficient": false, "expertise": false, "modifier": 0},
    "religion": {"proficient": false, "expertise": false, "modifier": 0},
    "sleight_of_hand": {"proficient": false, "expertise": false, "modifier": 0},
    "stealth": {"proficient": false, "expertise": false, "modifier": 0},
    "survival": {"proficient": false, "expertise": false, "modifier": 0}
  }',
  
  -- Tools (JSONB for flexibility)
  tools JSONB DEFAULT '{}',
  
  -- Weapons (JSONB array)
  weapons JSONB DEFAULT '[]',
  
  -- Features and traits (JSONB array)
  features JSONB DEFAULT '[]',
  
  -- Class features (JSONB array)
  class_features JSONB DEFAULT '[]',
  
  -- Feats (JSONB array)
  feats JSONB DEFAULT '[]',
  
  -- Spell data
  spell_attack_bonus INTEGER DEFAULT 0,
  spell_save_dc INTEGER DEFAULT 8,
  cantrips_known INTEGER DEFAULT 0,
  spells_known INTEGER DEFAULT 0,
  
  -- Current spell slots (used/available tracking)
  spell_slots_1_used INTEGER DEFAULT 0,
  spell_slots_2_used INTEGER DEFAULT 0,
  spell_slots_3_used INTEGER DEFAULT 0,
  spell_slots_4_used INTEGER DEFAULT 0,
  spell_slots_5_used INTEGER DEFAULT 0,
  spell_slots_6_used INTEGER DEFAULT 0,
  spell_slots_7_used INTEGER DEFAULT 0,
  spell_slots_8_used INTEGER DEFAULT 0,
  spell_slots_9_used INTEGER DEFAULT 0,
  
  -- Feat spell slots (JSONB for flexibility)
  feat_spell_slots JSONB DEFAULT '{}',
  
  -- Bardic inspiration (current uses)
  bardic_inspiration_used INTEGER DEFAULT 0,
  
  -- Song of rest data (for bards)
  song_of_rest JSONB DEFAULT '{"enabled": false, "die": "d6"}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Users can only see their own characters
CREATE POLICY "Users can view own characters" ON characters
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own characters
CREATE POLICY "Users can insert own characters" ON characters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own characters
CREATE POLICY "Users can update own characters" ON characters
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own characters
CREATE POLICY "Users can delete own characters" ON characters
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_characters_class_name ON characters(class_name);
CREATE INDEX idx_characters_level ON characters(level);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
