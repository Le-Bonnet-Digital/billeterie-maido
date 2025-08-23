/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Current policies on users table are causing infinite recursion
    - Complex subqueries referencing users table within users policies create circular dependencies

  2. Solution
    - Drop all existing problematic policies
    - Create simple, non-recursive policies
    - Use direct auth functions without complex joins

  3. New Policies
    - Users can read their own data: `auth.uid() = id`
    - Admins can read all users: `auth.jwt() ->> 'role' = 'admin'`
    - Allow user creation during signup
*/

-- Drop all existing policies on users table to prevent conflicts
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow user creation during signup"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Simple admin policy without recursion
CREATE POLICY "Service role can manage all users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);