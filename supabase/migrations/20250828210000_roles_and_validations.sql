/*
  # Extend roles and add reservation validations

  - Extend allowed roles in users.role check to include 'luge_provider' and 'atlm_collaborator'
  - Create reservation_validations table to record QR validations by activity
  - Add basic RLS policies for providers/admins to manage validations
*/

-- 1) Extend users.role allowed values
DO $$
BEGIN
  -- Try dropping an existing constraint if named users_role_check
  BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  EXCEPTION WHEN undefined_table THEN
    -- ignore
    NULL;
  END;

  ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'pony_provider', 'archery_provider', 'luge_provider', 'atlm_collaborator', 'client'));
END $$;
-- 2) Reservation validations table
CREATE TABLE IF NOT EXISTS reservation_validations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  activity text NOT NULL CHECK (activity IN ('poney','tir_arc','luge_bracelet')),
  validated_by uuid NOT NULL REFERENCES users(id),
  validated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reservation_validations ENABLE ROW LEVEL SECURITY;
-- 3) Policies: providers and admins can view/insert validations
DROP POLICY IF EXISTS "Providers can insert validations" ON reservation_validations;
DROP POLICY IF EXISTS "Providers can read validations" ON reservation_validations;
CREATE POLICY "Providers can insert validations" ON reservation_validations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin','pony_provider','archery_provider','luge_provider','atlm_collaborator')
    )
  );
CREATE POLICY "Providers can read validations" ON reservation_validations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin','pony_provider','archery_provider','luge_provider','atlm_collaborator')
    )
  );
