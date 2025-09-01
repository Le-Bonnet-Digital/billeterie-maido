\n\n-- Drop existing policies for passes table\nDROP POLICY IF EXISTS "Admins can manage passes" ON passes;
\nDROP POLICY IF EXISTS "Anyone can view passes for published events" ON passes;
\n\n-- Recreate policies with proper permissions\nCREATE POLICY "Admins can manage passes"\n  ON passes\n  FOR ALL\n  TO public\n  USING (\n    EXISTS (\n      SELECT 1 FROM users \n      WHERE users.id = auth.uid() \n      AND users.role = 'admin'\n    )\n  )\n  WITH CHECK (\n    EXISTS (\n      SELECT 1 FROM users \n      WHERE users.id = auth.uid() \n      AND users.role = 'admin'\n    )\n  );
\n\nCREATE POLICY "Anyone can view passes for published events"\n  ON passes\n  FOR SELECT\n  TO public\n  USING (\n    EXISTS (\n      SELECT 1 FROM events e\n      WHERE e.id = passes.event_id \n      AND e.status = 'published'\n    )\n  );
\n\n-- Ensure proper function exists for role checking\nCREATE OR REPLACE FUNCTION public.role()\nRETURNS text\nLANGUAGE sql\nSECURITY DEFINER\nAS $$\n  SELECT COALESCE(\n    (SELECT users.role FROM users WHERE users.id = auth.uid()),\n    'client'::text\n  );
\n$$;
;
