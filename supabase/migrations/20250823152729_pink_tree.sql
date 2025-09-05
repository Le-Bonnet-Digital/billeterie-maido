

-- Create the admin user in auth.users (this needs to be done via Supabase dashboard or API)
-- For now, we'll just ensure the users table is ready

-- Update RLS policies for passes table to work with authenticated users
DROP POLICY IF EXISTS "Allow all operations for development" ON passes;


-- Enable RLS
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;


-- Policy for viewing passes (public can see passes for published events)
CREATE POLICY "Anyone can view passes for published events"
  ON passes
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = passes.event_id 
      AND events.status = 'published'
    )
  );


-- Policy for admins to manage passes
CREATE POLICY "Admins can manage passes"
  ON passes
  FOR ALL
  TO authenticated
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


-- Ensure the users table has proper RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;


-- Allow users to read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);


-- Allow admins to read all user data
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );


-- Allow inserting new users (for registration)
CREATE POLICY "Allow user creation" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
;

