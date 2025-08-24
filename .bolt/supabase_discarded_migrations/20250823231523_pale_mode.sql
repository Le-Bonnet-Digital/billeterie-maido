/*
  # Fix time_slots to passes relationship

  1. Schema Changes
    - Add pass_id column to time_slots table if not exists
    - Remove event_id column from time_slots table
    - Add foreign key constraint between time_slots.pass_id and passes.id

  2. Data Migration
    - Migrate existing data from event_id to pass_id where possible
    - Clean up orphaned records

  3. Security
    - Update RLS policies to work with new structure
*/

-- First, let's check if pass_id column exists and add it if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_slots' AND column_name = 'pass_id'
  ) THEN
    ALTER TABLE time_slots ADD COLUMN pass_id uuid;
  END IF;
END $$;

-- Migrate existing data: link time_slots to passes through events
-- This assumes each event has at least one pass, we'll link to the first pass of each event
UPDATE time_slots 
SET pass_id = (
  SELECT p.id 
  FROM passes p 
  WHERE p.event_id = time_slots.event_id 
  LIMIT 1
)
WHERE pass_id IS NULL AND event_id IS NOT NULL;

-- Remove time_slots that couldn't be migrated (no corresponding pass)
DELETE FROM time_slots WHERE pass_id IS NULL;

-- Now make pass_id NOT NULL
ALTER TABLE time_slots ALTER COLUMN pass_id SET NOT NULL;

-- Add the foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'time_slots_pass_id_fkey'
    AND table_name = 'time_slots'
  ) THEN
    ALTER TABLE time_slots
    ADD CONSTRAINT time_slots_pass_id_fkey
    FOREIGN KEY (pass_id)
    REFERENCES passes(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Remove event_id column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_slots' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE time_slots DROP COLUMN event_id;
  END IF;
END $$;

-- Update RLS policies for time_slots
DROP POLICY IF EXISTS "Admins can manage time slots" ON time_slots;
DROP POLICY IF EXISTS "Anyone can view time slots for published events" ON time_slots;

-- Create new RLS policies
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

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_time_slots_pass_id ON time_slots(pass_id);