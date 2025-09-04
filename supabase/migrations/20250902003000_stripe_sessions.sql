-- Create stripe_sessions table for deduplication of Stripe webhooks
CREATE TABLE stripe_sessions (
  id text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stripe_sessions ENABLE ROW LEVEL SECURITY;
