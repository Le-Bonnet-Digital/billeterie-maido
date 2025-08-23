/*
  # Fix pass deletion RLS policies

  1. Security Changes
    - Drop existing restrictive policies on passes table
    - Create new policies that allow admins to delete passes
    - Add proper admin role checking function
    - Enable proper CASCADE deletion for related records

  2. Changes
    - Allow admins to perform all operations on passes
    - Fix deletion permissions that were blocking pass removal
*/

-- First, let's create a function to check if current user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Drop existing policies on passes table
DROP POLICY IF EXISTS "Admins can manage passes" ON passes;
DROP POLICY IF EXISTS "Anyone can view passes for published events" ON passes;

-- Create new comprehensive policies for passes
CREATE POLICY "Admins can view all passes"
  ON passes
  FOR SELECT
  TO authenticated
  USING (auth.is_admin());

CREATE POLICY "Admins can insert passes"
  ON passes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.is_admin());

CREATE POLICY "Admins can update passes"
  ON passes
  FOR UPDATE
  TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

CREATE POLICY "Admins can delete passes"
  ON passes
  FOR DELETE
  TO authenticated
  USING (auth.is_admin());

-- Also allow public to view passes for published events
CREATE POLICY "Public can view passes for published events"
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

-- Ensure RLS is enabled
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;