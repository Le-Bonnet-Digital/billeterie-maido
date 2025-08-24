/*
  # Debug pass deletion permissions

  1. Check current policies
  2. Add comprehensive admin permissions
  3. Add debugging function
*/

-- Check if auth.role() function exists, if not create it
CREATE OR REPLACE FUNCTION auth.role() 
RETURNS text 
LANGUAGE sql 
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    'anon'
  )::text;
$$;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Admins can manage passes" ON passes;

-- Create comprehensive admin policy for passes
CREATE POLICY "Admins can manage all passes"
  ON passes
  FOR ALL
  TO public
  USING (auth.role() = 'admin')
  WITH CHECK (auth.role() = 'admin');

-- Also allow service role (for admin operations)
CREATE POLICY "Service role can manage passes"
  ON passes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a debug function to check permissions
CREATE OR REPLACE FUNCTION debug_pass_permissions(pass_uuid uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'pass_exists', EXISTS(SELECT 1 FROM passes WHERE id = pass_uuid),
    'current_role', auth.role(),
    'can_delete', (
      SELECT count(*) > 0 
      FROM passes 
      WHERE id = pass_uuid 
      AND (auth.role() = 'admin' OR current_user = 'service_role')
    )
  );
$$;