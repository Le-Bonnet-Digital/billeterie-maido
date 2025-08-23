/*
  # Link time slots to passes instead of events

  1. Schema Changes
    - Drop foreign key constraint from time_slots.event_id to events.id
    - Add foreign key constraint from time_slots.pass_id to passes.id
    - Add pass_id column to time_slots table
    - Remove event_id column from time_slots table

  2. Data Migration
    - Update existing time slots to link to passes instead of events
    - Preserve existing relationships where possible

  3. Security
    - Update RLS policies to work with new structure
*/

-- First, add the new pass_id column
ALTER TABLE time_slots ADD COLUMN pass_id uuid;

-- Update existing time slots to link to passes
-- This assumes each event has passes, and we'll link time slots to the first pass of each event
UPDATE time_slots 
SET pass_id = (
  SELECT p.id 
  FROM passes p 
  WHERE p.event_id = time_slots.event_id 
  LIMIT 1
)
WHERE event_id IS NOT NULL;

-- Make pass_id NOT NULL after data migration
ALTER TABLE time_slots ALTER COLUMN pass_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE time_slots ADD CONSTRAINT time_slots_pass_id_fkey 
  FOREIGN KEY (pass_id) REFERENCES passes(id) ON DELETE CASCADE;

-- Drop the old event_id column and its constraint
ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS time_slots_event_id_fkey;
ALTER TABLE time_slots DROP COLUMN event_id;

-- Update the index
DROP INDEX IF EXISTS idx_time_slots_event;
CREATE INDEX idx_time_slots_pass ON time_slots(pass_id, activity);

-- Update RLS policies
DROP POLICY IF EXISTS "Admins can manage time slots" ON time_slots;
DROP POLICY IF EXISTS "Anyone can view time slots for published events" ON time_slots;

CREATE POLICY "Admins can manage time slots"
  ON time_slots
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Anyone can view time slots for published events"
  ON time_slots
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM passes p
    JOIN events e ON e.id = p.event_id
    WHERE p.id = time_slots.pass_id 
    AND e.status = 'published'
  ));