/*
  # Fix admin permissions for events table

  1. Security Updates
    - Update RLS policies to allow admins to update events
    - Ensure proper admin role checking via JWT claim
    - Add debugging for permission issues

  2. Policy Changes
    - Fix "Admins can manage events" policy
    - Ensure it works for both authenticated users and service role
*/

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

-- Create new comprehensive admin policy
CREATE POLICY "Admins can manage events"
  ON public.events
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Also ensure service role can manage everything
CREATE POLICY "Service role can manage all events"
  ON public.events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);