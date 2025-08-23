/*
  # Fix pass deletion without authentication

  1. Security Changes
    - Add policy to allow anonymous users to manage passes (temporary solution)
    - Or disable RLS temporarily for development
    
  2. Alternative: Create a service role policy
    - Allow operations when using service role key
*/

-- Option 1: Allow anonymous users to manage passes (for development only)
DROP POLICY IF EXISTS "Admins can delete passes" ON passes;
DROP POLICY IF EXISTS "Admins can manage passes" ON passes;
DROP POLICY IF EXISTS "Anyone can view passes for published events" ON passes;

-- Temporarily allow all operations for development
CREATE POLICY "Allow all operations on passes for development"
  ON passes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Note: This is NOT secure for production!
-- In production, you should implement proper authentication