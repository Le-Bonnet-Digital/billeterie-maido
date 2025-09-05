

-- Vérifier que la colonne has_animations existe dans events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'has_animations'
  ) THEN
    ALTER TABLE events ADD COLUMN has_animations boolean DEFAULT false;

  END IF;

END $$;


-- Vérifier que la table event_animations existe
CREATE TABLE IF NOT EXISTS event_animations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  location text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  capacity integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);


-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_event_animations_event_id ON event_animations(event_id);

CREATE INDEX IF NOT EXISTS idx_event_animations_time ON event_animations(start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_event_animations_active ON event_animations(is_active) WHERE is_active = true;


-- Activer RLS
ALTER TABLE event_animations ENABLE ROW LEVEL SECURITY;


-- Policies pour event_animations
DROP POLICY IF EXISTS "Admins can manage event animations" ON event_animations;

CREATE POLICY "Admins can manage event animations"
  ON event_animations
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


DROP POLICY IF EXISTS "Anyone can view active animations for published events" ON event_animations;

CREATE POLICY "Anyone can view active animations for published events"
  ON event_animations
  FOR SELECT
  TO public
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_animations.event_id AND events.status = 'published'
    )
  );
;

