/*
  # Safe migration to fix time_slots relationships

  1. Dependencies Management
    - Drop all foreign key constraints on event_id
    - Drop any indexes on event_id
    - Drop any policies that reference event_id

  2. Data Migration
    - Add pass_id column if not exists
    - Migrate data from event_id to pass_id safely
    - Handle orphaned records

  3. New Structure
    - Add foreign key constraint to passes
    - Update RLS policies
    - Add performance indexes

  4. Cleanup
    - Drop event_id column after all dependencies are removed
*/

-- Step 1: Identify and drop all dependencies on event_id
DO $$
DECLARE
    constraint_name text;
    index_name text;
BEGIN
    -- Drop foreign key constraints on event_id
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey)
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'time_slots' 
        AND a.attname = 'event_id'
        AND c.contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped foreign key constraint: %', constraint_name;
    END LOOP;

    -- Drop indexes on event_id
    FOR index_name IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'time_slots'
        AND indexdef LIKE '%event_id%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', index_name);
        RAISE NOTICE 'Dropped index: %', index_name;
    END LOOP;
END $$;

-- Step 2: Drop existing RLS policies that might reference event_id
DROP POLICY IF EXISTS "Admins can manage time slots" ON time_slots;
DROP POLICY IF EXISTS "Anyone can view time slots for published events" ON time_slots;

-- Step 3: Add pass_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_slots' AND column_name = 'pass_id'
    ) THEN
        ALTER TABLE time_slots ADD COLUMN pass_id uuid;
        RAISE NOTICE 'Added pass_id column to time_slots';
    END IF;
END $$;

-- Step 4: Migrate data from event_id to pass_id
DO $$
DECLARE
    slot_record RECORD;
    first_pass_id uuid;
BEGIN
    -- Only migrate if event_id exists and pass_id is null
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_slots' AND column_name = 'event_id'
    ) THEN
        FOR slot_record IN 
            SELECT id, event_id 
            FROM time_slots 
            WHERE pass_id IS NULL AND event_id IS NOT NULL
        LOOP
            -- Find the first pass for this event
            SELECT id INTO first_pass_id
            FROM passes 
            WHERE event_id = slot_record.event_id 
            LIMIT 1;
            
            IF first_pass_id IS NOT NULL THEN
                UPDATE time_slots 
                SET pass_id = first_pass_id 
                WHERE id = slot_record.id;
                RAISE NOTICE 'Migrated time_slot % from event % to pass %', 
                    slot_record.id, slot_record.event_id, first_pass_id;
            ELSE
                -- Delete orphaned time slots that can't be migrated
                DELETE FROM time_slots WHERE id = slot_record.id;
                RAISE NOTICE 'Deleted orphaned time_slot % (no pass found for event %)', 
                    slot_record.id, slot_record.event_id;
            END IF;
        END LOOP;
    END IF;
END $$;

-- Step 5: Make pass_id NOT NULL and add foreign key constraint
ALTER TABLE time_slots ALTER COLUMN pass_id SET NOT NULL;

-- Add foreign key constraint to passes
ALTER TABLE time_slots 
ADD CONSTRAINT time_slots_pass_id_fkey 
FOREIGN KEY (pass_id) REFERENCES passes(id) ON DELETE CASCADE;

-- Step 6: Drop event_id column now that all dependencies are removed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_slots' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE time_slots DROP COLUMN event_id;
        RAISE NOTICE 'Dropped event_id column from time_slots';
    END IF;
END $$;

-- Step 7: Create new RLS policies for the updated structure
CREATE POLICY "Admins can manage time slots"
ON time_slots
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

CREATE POLICY "Anyone can view time slots for published events"
ON time_slots
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM passes p
        JOIN events e ON e.id = p.event_id
        WHERE p.id = time_slots.pass_id 
        AND e.status = 'published'
    )
);

-- Step 8: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_time_slots_pass_activity 
ON time_slots(pass_id, activity);

CREATE INDEX IF NOT EXISTS idx_time_slots_slot_time 
ON time_slots(slot_time);

-- Step 9: Update the existing index name if it exists
DROP INDEX IF EXISTS idx_time_slots_event;