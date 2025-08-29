/*
  # Unify Admin RLS Policies via users table

  Context:
  - Some previous migrations used `auth.role()` or `auth.jwt() ->> 'role' = 'admin'`
    which is brittle unless custom JWT claims are set.
  - We standardize all admin write permissions to check the `public.users` table
    with the current `auth.uid()` and role = 'admin'.

  Changes:
  - Drop and recreate "Admins can manage …" policies on key tables using a
    consistent EXISTS pattern with WITH CHECK mirrors.
*/

-- Events
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Admins can manage events"
  ON public.events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Passes
DROP POLICY IF EXISTS "Admins can manage passes" ON public.passes;
CREATE POLICY "Admins can manage passes"
  ON public.passes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Time Slots
DROP POLICY IF EXISTS "Admins can manage time slots" ON public.time_slots;
CREATE POLICY "Admins can manage time slots"
  ON public.time_slots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Event Activities (if present)
DROP POLICY IF EXISTS "Admins can manage event activities" ON public.event_activities;
CREATE POLICY "Admins can manage event activities"
  ON public.event_activities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Activities (if present)
DROP POLICY IF EXISTS "Admins can manage activities" ON public.activities;
CREATE POLICY "Admins can manage activities"
  ON public.activities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Reservations (admin full management only; read by email remains app-side)
DROP POLICY IF EXISTS "Admins can manage all reservations" ON public.reservations;
CREATE POLICY "Admins can manage all reservations"
  ON public.reservations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Shop (if present)
DROP POLICY IF EXISTS "Admins can manage shops" ON public.shops;
CREATE POLICY "Admins can manage shops"
  ON public.shops
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage shop products" ON public.shop_products;
CREATE POLICY "Admins can manage shop products"
  ON public.shop_products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

