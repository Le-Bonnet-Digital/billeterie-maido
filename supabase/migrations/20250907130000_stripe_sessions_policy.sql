-- Add service role policy for stripe_sessions
CREATE POLICY "Allow service role" ON public.stripe_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
