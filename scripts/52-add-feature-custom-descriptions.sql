-- Add per-feature custom descriptions column
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS feature_custom_descriptions JSONB;

COMMENT ON COLUMN characters.feature_custom_descriptions IS 'Per-feature custom rich text and optional image URL; keyed by feature name.';


