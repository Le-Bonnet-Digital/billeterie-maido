/*
  # Revert admin policy to use users table

  1. Security Updates
    - Replace JWT claim check with table lookup
*/

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

-- Create policy checking role from public.users table
CREATE POLICY "Admins can manage events"
  ON public.events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
