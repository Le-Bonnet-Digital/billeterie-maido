

-- Create pass_activities table
CREATE TABLE IF NOT EXISTS pass_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id uuid REFERENCES passes(id) ON DELETE CASCADE,
  event_activity_id uuid REFERENCES event_activities(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pass_id, event_activity_id)
);


-- Enable RLS
ALTER TABLE pass_activities ENABLE ROW LEVEL SECURITY;


-- Add policies
CREATE POLICY "Admins can manage pass activities"
  ON pass_activities
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ));


CREATE POLICY "Anyone can view pass activities for published events"
  ON pass_activities
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM passes p
    JOIN events e ON e.id = p.event_id
    WHERE p.id = pass_activities.pass_id AND e.status = 'published'
  ));


-- Remove old columns from passes table if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'passes' AND column_name = 'poney_max_bookings') THEN
    ALTER TABLE passes DROP COLUMN poney_max_bookings;

  END IF;

  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'passes' AND column_name = 'tir_arc_max_bookings') THEN
    ALTER TABLE passes DROP COLUMN tir_arc_max_bookings;

  END IF;

END $$;


-- Update time_slots table structure
DO $$
BEGIN
  -- Add event_activity_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_slots' AND column_name = 'event_activity_id') THEN
    ALTER TABLE time_slots ADD COLUMN event_activity_id uuid REFERENCES event_activities(id) ON DELETE CASCADE;

  END IF;

  
  -- Remove old activity column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_slots' AND column_name = 'activity') THEN
    ALTER TABLE time_slots DROP COLUMN activity;

  END IF;

  
  -- Remove activity_resource_id column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_slots' AND column_name = 'activity_resource_id') THEN
    ALTER TABLE time_slots DROP COLUMN activity_resource_id;

  END IF;

END $$;


-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pass_activities_pass_id ON pass_activities(pass_id);

CREATE INDEX IF NOT EXISTS idx_pass_activities_event_activity_id ON pass_activities(event_activity_id);

CREATE INDEX IF NOT EXISTS idx_time_slots_event_activity_id ON time_slots(event_activity_id);
;

