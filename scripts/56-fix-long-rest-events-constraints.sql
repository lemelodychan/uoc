-- Fix long_rest_events table constraints
-- The confirmed_by_character_id should be nullable since it's only set when confirmed

-- First, let's check the current constraints
-- This will show us what constraints exist on the table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'long_rest_events'::regclass;

-- If there's a NOT NULL constraint on confirmed_by_character_id, we need to drop it
-- and recreate the column as nullable
DO $$
BEGIN
    -- Check if the column exists and has a NOT NULL constraint
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'long_rest_events' 
        AND column_name = 'confirmed_by_character_id'
        AND is_nullable = 'NO'
    ) THEN
        -- Drop the NOT NULL constraint
        ALTER TABLE long_rest_events 
        ALTER COLUMN confirmed_by_character_id DROP NOT NULL;
        
        RAISE NOTICE 'Dropped NOT NULL constraint from confirmed_by_character_id';
    ELSE
        RAISE NOTICE 'confirmed_by_character_id is already nullable or does not exist';
    END IF;
END $$;

-- Verify the column is now nullable
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name = 'long_rest_events' 
AND column_name = 'confirmed_by_character_id';

-- Also ensure the column has the correct foreign key constraint
-- (This should already exist from the original table creation)
DO $$
BEGIN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'long_rest_events'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'confirmed_by_character_id'
    ) THEN
        -- Add the foreign key constraint if it doesn't exist
        ALTER TABLE long_rest_events 
        ADD CONSTRAINT fk_long_rest_events_confirmed_by 
        FOREIGN KEY (confirmed_by_character_id) 
        REFERENCES characters(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added foreign key constraint for confirmed_by_character_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for confirmed_by_character_id already exists';
    END IF;
END $$;
