/*
  # Lock down public read on reservations

  Removes broad read policy on `public.reservations` so that only admins
  (and service role) can access via existing admin policy and edge functions.
*/

DROP POLICY IF EXISTS "Users can view reservations by email" ON public.reservations;

-- Admins still have full access via policy recreated elsewhere
-- (see 20250828103000_fix_admin_policies.sql)

