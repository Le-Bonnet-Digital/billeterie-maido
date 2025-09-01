\n\n-- Option 1: Allow anonymous users to manage passes (for development only)\nDROP POLICY IF EXISTS "Admins can delete passes" ON passes;
\nDROP POLICY IF EXISTS "Admins can manage passes" ON passes;
\nDROP POLICY IF EXISTS "Anyone can view passes for published events" ON passes;
\n\n-- Temporarily allow all operations for development\nCREATE POLICY "Allow all operations on passes for development"\n  ON passes\n  FOR ALL\n  TO public\n  USING (true)\n  WITH CHECK (true);
\n\n-- Note: This is NOT secure for production!\n-- In production, you should implement proper authentication;
