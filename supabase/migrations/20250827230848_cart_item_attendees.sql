-- Add attendee fields to cart_items for per-ticket information capture
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS attendee_first_name text,
  ADD COLUMN IF NOT EXISTS attendee_last_name text,
  ADD COLUMN IF NOT EXISTS attendee_birth_year integer,
  ADD COLUMN IF NOT EXISTS access_conditions_ack boolean DEFAULT false;

-- Optional: index for querying by session with attendee context
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items(session_id);

