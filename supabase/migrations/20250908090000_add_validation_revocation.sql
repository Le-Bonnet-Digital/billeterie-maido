-- Add revocation fields and policies for reservation_validations history
ALTER TABLE public.reservation_validations
  ADD COLUMN revoked_at timestamptz,
  ADD COLUMN revoked_by uuid,
  ADD COLUMN revoke_reason text;

-- Policy: admins can revoke validations (update rows)
DROP POLICY IF EXISTS "Admins can revoke validations" ON reservation_validations;
CREATE POLICY "Admins can revoke validations" ON reservation_validations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Policy: staff can read reservations for history
DROP POLICY IF EXISTS "Staff can read reservations" ON reservations;
CREATE POLICY "Staff can read reservations" ON reservations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin','pony_provider','archery_provider','luge_provider','atlm_collaborator')));

-- Policy: staff can read users emails
DROP POLICY IF EXISTS "Staff can read users" ON users;
CREATE POLICY "Staff can read users" ON users
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin','pony_provider','archery_provider','luge_provider','atlm_collaborator')));
