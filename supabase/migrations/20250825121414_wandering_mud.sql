/*
  # Fix Events RLS Policies for Admin Access

  1. Security Updates
    - Update admin policy to use proper auth functions
    - Ensure admins can update events with has_animations field
    - Add debugging for RLS policies

  2. Policy Changes
    - Fix admin policy to work with current auth system
    - Ensure all event fields can be updated by admins
*/

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

-- Create new admin policy that works with the current auth system
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

-- Ensure the policy for public viewing is still there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'events' 
    AND policyname = 'Anyone can view published events'
  ) THEN
    CREATE POLICY "Anyone can view published events"
      ON public.events
      FOR SELECT
      TO public
      USING (status = 'published');
  END IF;
END $$;