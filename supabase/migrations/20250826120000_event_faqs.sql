\n\nCREATE TABLE IF NOT EXISTS event_faqs (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  event_id uuid REFERENCES events(id) ON DELETE CASCADE,\n  question text NOT NULL,\n  answer text NOT NULL,\n  position integer NOT NULL\n);
\n\nALTER TABLE event_faqs ENABLE ROW LEVEL SECURITY;
\n\nCREATE POLICY "Admins can manage event FAQs"\n  ON event_faqs\n  FOR ALL\n  TO authenticated\n  USING (\n    EXISTS (\n      SELECT 1 FROM users\n      WHERE users.id = auth.uid() AND users.role = 'admin'\n    )\n  )\n  WITH CHECK (\n    EXISTS (\n      SELECT 1 FROM users\n      WHERE users.id = auth.uid() AND users.role = 'admin'\n    )\n  );
\n\nCREATE POLICY "Anyone can view FAQs for published events"\n  ON event_faqs\n  FOR SELECT\n  TO public\n  USING (\n    EXISTS (\n      SELECT 1 FROM events\n      WHERE events.id = event_faqs.event_id\n        AND events.status = 'published'\n    )\n  );
\n\nCREATE INDEX IF NOT EXISTS idx_event_faqs_event_id ON event_faqs(event_id);
\nCREATE INDEX IF NOT EXISTS idx_event_faqs_position ON event_faqs(event_id, position);
\n;
