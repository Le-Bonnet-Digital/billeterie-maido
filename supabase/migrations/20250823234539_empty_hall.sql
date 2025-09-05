

-- Create activities master table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  icon text DEFAULT '',
  created_at timestamptz DEFAULT now()
);


-- Create event_activities junction table
CREATE TABLE IF NOT EXISTS event_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  stock_limit integer DEFAULT NULL, -- NULL = unlimited
  requires_time_slot boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, activity_id)
);


-- Insert default activities
INSERT INTO activities (name, description, icon) VALUES
  ('poney', 'Balade à poney pour petits et grands', '🐴'),
  ('tir_arc', 'Initiation au tir à l''arc', '🏹')
ON CONFLICT (name) DO NOTHING;


-- Update activity_resources to reference event_activities
DO $$
BEGIN
  -- Add event_activity_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_resources' AND column_name = 'event_activity_id'
  ) THEN
    ALTER TABLE activity_resources ADD COLUMN event_activity_id uuid REFERENCES event_activities(id) ON DELETE CASCADE;

  END IF;

END $$;


-- Drop the old activity column and total_capacity (will be managed by event_activities)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_resources' AND column_name = 'activity'
  ) THEN
    ALTER TABLE activity_resources DROP COLUMN activity;

  END IF;

  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_resources' AND column_name = 'total_capacity'
  ) THEN
    ALTER TABLE activity_resources DROP COLUMN total_capacity;

  END IF;

END $$;


-- Update time_slots to reference activity_resources properly
DO $$
BEGIN
  -- Remove the old activity column from time_slots
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_slots' AND column_name = 'activity'
  ) THEN
    ALTER TABLE time_slots DROP COLUMN activity;

  END IF;

END $$;


-- Add quantity support to cart_items and reservations
DO $$
BEGIN
  -- Add activity selection to cart_items
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cart_items' AND column_name = 'event_activity_id'
  ) THEN
    ALTER TABLE cart_items ADD COLUMN event_activity_id uuid REFERENCES event_activities(id) ON DELETE CASCADE;

  END IF;

  
  -- Add activity selection to reservations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'event_activity_id'
  ) THEN
    ALTER TABLE reservations ADD COLUMN event_activity_id uuid REFERENCES event_activities(id) ON DELETE CASCADE;

  END IF;

END $$;


-- Remove pony_resources table (deprecated)
DROP TABLE IF EXISTS pony_resources CASCADE;


-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

ALTER TABLE event_activities ENABLE ROW LEVEL SECURITY;


-- Policies for activities
CREATE POLICY "Anyone can view activities"
  ON activities
  FOR SELECT
  TO public
  USING (true);


CREATE POLICY "Admins can manage activities"
  ON activities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );


-- Policies for event_activities
CREATE POLICY "Anyone can view event activities for published events"
  ON event_activities
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_activities.event_id AND events.status = 'published'
    )
  );


CREATE POLICY "Admins can manage event activities"
  ON event_activities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );


-- Update existing functions
CREATE OR REPLACE FUNCTION get_event_activity_remaining_stock(event_activity_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stock_limit integer;

  used_stock integer;

BEGIN
  -- Get the stock limit for this event activity
  SELECT ea.stock_limit INTO stock_limit
  FROM event_activities ea
  WHERE ea.id = event_activity_uuid;

  
  -- If no limit, return a large number
  IF stock_limit IS NULL THEN
    RETURN 999999;

  END IF;

  
  -- Count used stock from reservations
  SELECT COALESCE(SUM(r.quantity), 0) INTO used_stock
  FROM reservations r
  WHERE r.event_activity_id = event_activity_uuid
    AND r.payment_status = 'paid';

  
  -- Add reserved stock from cart items
  SELECT used_stock + COALESCE(SUM(ci.quantity), 0) INTO used_stock
  FROM cart_items ci
  WHERE ci.event_activity_id = event_activity_uuid
    AND ci.reserved_until > now();

  
  RETURN GREATEST(0, stock_limit - used_stock);

END;

$$;
;

