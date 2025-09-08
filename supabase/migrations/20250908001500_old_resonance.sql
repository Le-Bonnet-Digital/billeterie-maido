/*
  # Fix infinite recursion in users table RLS policies

  1. Security Changes
    - Drop existing problematic RLS policies on users table
    - Create simplified policies that avoid circular references
    - Ensure users can read their own data without recursion
    - Allow service role full access
    - Create a simple function to check admin role without recursion

  2. Policy Changes
    - Users can read their own profile data
    - Service role has full access
    - Admins can read all users (using a non-recursive check)
    - Admins can update users
    - Allow user creation during signup
*/

-- Drop existing policies that may cause recursion
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Staff can read users" ON users;

-- Drop the problematic is_admin function if it exists
DROP FUNCTION IF EXISTS is_admin();

-- Create a simple function to check if current user is admin without recursion
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users au
    JOIN public.users u ON au.id = u.id
    WHERE au.id = auth.uid() 
    AND u.role = 'admin'
  );
$$;

-- Create new simplified policies
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow user creation during signup"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role full access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.is_admin());

CREATE POLICY "Admins can update users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());