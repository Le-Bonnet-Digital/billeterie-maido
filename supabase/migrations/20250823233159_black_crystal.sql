/*
  # Add shared activity resources system

  1. New Tables
    - `activity_resources`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key to events)
      - `activity` (text, 'poney' or 'tir_arc')
      - `total_capacity` (integer)
      - `created_at` (timestamp)

  2. Changes to existing tables
    - Add `activity_resource_id` to `time_slots` table
    - Add `max_bookings` to `passes` table for activity-specific limits

  3. Security
    - Enable RLS on new tables
    - Add policies for admin access
    - Add function to calculate remaining capacity across shared resources

  4. Functions
    - `get_activity_remaining_capacity` - calculates remaining capacity for an activity
    - `get_pass_activity_remaining` - calculates remaining bookings for a pass on an activity
*/

-- Create activity_resources table
CREATE TABLE IF NOT EXISTS activity_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  activity text NOT NULL CHECK (activity IN ('poney', 'tir_arc')),
  total_capacity integer NOT NULL DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, activity)
);

-- Enable RLS
ALTER TABLE activity_resources ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Admins can manage activity resources"
  ON activity_resources
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

CREATE POLICY "Anyone can view activity resources for published events"
  ON activity_resources
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = activity_resources.event_id AND events.status = 'published'
  ));

-- Add activity_resource_id to time_slots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_slots' AND column_name = 'activity_resource_id'
  ) THEN
    ALTER TABLE time_slots ADD COLUMN activity_resource_id uuid REFERENCES activity_resources(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add max_bookings to passes for activity-specific limits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'passes' AND column_name = 'poney_max_bookings'
  ) THEN
    ALTER TABLE passes ADD COLUMN poney_max_bookings integer;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'passes' AND column_name = 'tir_arc_max_bookings'
  ) THEN
    ALTER TABLE passes ADD COLUMN tir_arc_max_bookings integer;
  END IF;
END $$;

-- Function to get remaining capacity for an activity resource
CREATE OR REPLACE FUNCTION get_activity_remaining_capacity(activity_resource_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_cap integer;
  used_cap integer;
BEGIN
  -- Get total capacity
  SELECT total_capacity INTO total_cap
  FROM activity_resources
  WHERE id = activity_resource_uuid;
  
  IF total_cap IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Count used capacity from all reservations for this activity resource
  SELECT COALESCE(SUM(1), 0) INTO used_cap
  FROM reservations r
  JOIN time_slots ts ON r.time_slot_id = ts.id
  WHERE ts.activity_resource_id = activity_resource_uuid
    AND r.payment_status = 'paid';
  
  RETURN GREATEST(0, total_cap - used_cap);
END;
$$;

-- Function to get remaining bookings for a pass on a specific activity
CREATE OR REPLACE FUNCTION get_pass_activity_remaining(pass_uuid uuid, activity_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  max_bookings integer;
  used_bookings integer;
BEGIN
  -- Get max bookings for this activity
  IF activity_name = 'poney' THEN
    SELECT poney_max_bookings INTO max_bookings
    FROM passes WHERE id = pass_uuid;
  ELSIF activity_name = 'tir_arc' THEN
    SELECT tir_arc_max_bookings INTO max_bookings
    FROM passes WHERE id = pass_uuid;
  ELSE
    RETURN 0;
  END IF;
  
  -- If no limit set, return a large number
  IF max_bookings IS NULL THEN
    RETURN 999999;
  END IF;
  
  -- Count used bookings for this pass and activity
  SELECT COALESCE(COUNT(*), 0) INTO used_bookings
  FROM reservations r
  JOIN time_slots ts ON r.time_slot_id = ts.id
  WHERE r.pass_id = pass_uuid
    AND ts.activity = activity_name
    AND r.payment_status = 'paid';
  
  RETURN GREATEST(0, max_bookings - used_bookings);
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_resources_event_activity 
ON activity_resources(event_id, activity);

CREATE INDEX IF NOT EXISTS idx_time_slots_activity_resource 
ON time_slots(activity_resource_id);

-- Insert default activity resources for existing events
INSERT INTO activity_resources (event_id, activity, total_capacity)
SELECT DISTINCT e.id, 'poney', 100
FROM events e
WHERE NOT EXISTS (
  SELECT 1 FROM activity_resources ar 
  WHERE ar.event_id = e.id AND ar.activity = 'poney'
);

INSERT INTO activity_resources (event_id, activity, total_capacity)
SELECT DISTINCT e.id, 'tir_arc', 100
FROM events e
WHERE NOT EXISTS (
  SELECT 1 FROM activity_resources ar 
  WHERE ar.event_id = e.id AND ar.activity = 'tir_arc'
);

-- Link existing time_slots to activity_resources
UPDATE time_slots 
SET activity_resource_id = ar.id
FROM activity_resources ar
JOIN passes p ON p.event_id = ar.event_id
WHERE time_slots.pass_id = p.id 
  AND time_slots.activity = ar.activity
  AND time_slots.activity_resource_id IS NULL;