-- Create reservation_activities table to link reservations with specific activities and time slots
CREATE TABLE IF NOT EXISTS reservation_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  event_activity_id uuid NOT NULL REFERENCES event_activities(id) ON DELETE CASCADE,
  time_slot_id uuid REFERENCES time_slots(id) ON DELETE CASCADE
);

ALTER TABLE reservation_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage reservation activities" ON reservation_activities;
CREATE POLICY "Admins can manage reservation activities" ON reservation_activities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
