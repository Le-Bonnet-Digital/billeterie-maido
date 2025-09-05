

-- Drop existing policies for time_slots
DROP POLICY IF EXISTS "Admins can manage time slots" ON time_slots;

DROP POLICY IF EXISTS "Anyone can view time slots for published events" ON time_slots;


-- Create new policies for time_slots that check the users table
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
      SELECT 1 FROM events e
      WHERE e.id = time_slots.event_id 
      AND e.status = 'published'
    )
  );


-- Also update reservations policies to ensure admins can delete reservations
DROP POLICY IF EXISTS "Admins can manage all reservations" ON reservations;


CREATE POLICY "Admins can manage all reservations"
  ON reservations
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
;

