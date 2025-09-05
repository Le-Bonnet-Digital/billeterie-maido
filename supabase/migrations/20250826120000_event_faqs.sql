

CREATE TABLE IF NOT EXISTS event_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  position integer NOT NULL
);


ALTER TABLE event_faqs ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admins can manage event FAQs"
  ON event_faqs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );


CREATE POLICY "Anyone can view FAQs for published events"
  ON event_faqs
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_faqs.event_id
        AND events.status = 'published'
    )
  );


CREATE INDEX IF NOT EXISTS idx_event_faqs_event_id ON event_faqs(event_id);

CREATE INDEX IF NOT EXISTS idx_event_faqs_position ON event_faqs(event_id, position);

;

