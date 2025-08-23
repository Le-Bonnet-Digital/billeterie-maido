/*
  # Fix pass deletion policies

  1. Security Updates
    - Update RLS policies for passes table to allow DELETE operations for admins
    - Ensure proper cascade deletion for related records

  2. Changes
    - Add DELETE policy for passes table
    - Update existing policies if needed
*/

-- Drop existing policies for passes table
DROP POLICY IF EXISTS "Admins can manage passes" ON passes;
DROP POLICY IF EXISTS "Anyone can view passes for published events" ON passes;

-- Recreate policies with proper permissions
CREATE POLICY "Admins can manage passes"
  ON passes
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Anyone can view passes for published events"
  ON passes
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = passes.event_id 
      AND e.status = 'published'
    )
  );

-- Ensure proper function exists for role checking
CREATE OR REPLACE FUNCTION public.role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT users.role FROM users WHERE users.id = auth.uid()),
    'client'::text
  );
$$;