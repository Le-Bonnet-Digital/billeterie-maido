-- Enable RLS and add service role policy for webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role" ON public.webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
