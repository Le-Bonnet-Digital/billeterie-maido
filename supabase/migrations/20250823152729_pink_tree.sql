\n\n-- Create the admin user in auth.users (this needs to be done via Supabase dashboard or API)\n-- For now, we'll just ensure the users table is ready\n\n-- Update RLS policies for passes table to work with authenticated users\nDROP POLICY IF EXISTS "Allow all operations for development" ON passes;
\n\n-- Enable RLS\nALTER TABLE passes ENABLE ROW LEVEL SECURITY;
\n\n-- Policy for viewing passes (public can see passes for published events)\nCREATE POLICY "Anyone can view passes for published events"\n  ON passes\n  FOR SELECT\n  TO public\n  USING (\n    EXISTS (\n      SELECT 1 FROM events \n      WHERE events.id = passes.event_id \n      AND events.status = 'published'\n    )\n  );
\n\n-- Policy for admins to manage passes\nCREATE POLICY "Admins can manage passes"\n  ON passes\n  FOR ALL\n  TO authenticated\n  USING (\n    EXISTS (\n      SELECT 1 FROM users \n      WHERE users.id = auth.uid() \n      AND users.role = 'admin'\n    )\n  )\n  WITH CHECK (\n    EXISTS (\n      SELECT 1 FROM users \n      WHERE users.id = auth.uid() \n      AND users.role = 'admin'\n    )\n  );
\n\n-- Ensure the users table has proper RLS\nALTER TABLE users ENABLE ROW LEVEL SECURITY;
\n\n-- Allow users to read their own data\nCREATE POLICY "Users can read own data" ON users\n  FOR SELECT TO authenticated\n  USING (auth.uid() = id);
\n\n-- Allow admins to read all user data\nCREATE POLICY "Admins can read all users" ON users\n  FOR SELECT TO authenticated\n  USING (\n    EXISTS (\n      SELECT 1 FROM users \n      WHERE users.id = auth.uid() \n      AND users.role = 'admin'\n    )\n  );
\n\n-- Allow inserting new users (for registration)\nCREATE POLICY "Allow user creation" ON users\n  FOR INSERT TO authenticated\n  WITH CHECK (auth.uid() = id);
;
