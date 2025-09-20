-- Create class_features table to store detailed class features with titles and descriptions
CREATE TABLE IF NOT EXISTS class_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  feature_type TEXT DEFAULT 'class', -- 'class', 'subclass', 'ability_score_improvement', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE class_features ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read class features (they're reference data)
CREATE POLICY "Class features are viewable by everyone" ON class_features
  FOR SELECT USING (true);

-- Only allow authenticated users to insert/update class features (for admin purposes)
CREATE POLICY "Only authenticated users can modify class features" ON class_features
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_class_features_class_id ON class_features(class_id);
CREATE INDEX idx_class_features_level ON class_features(level);
CREATE INDEX idx_class_features_class_level ON class_features(class_id, level);

-- Create updated_at trigger
CREATE TRIGGER update_class_features_updated_at BEFORE UPDATE ON class_features
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
