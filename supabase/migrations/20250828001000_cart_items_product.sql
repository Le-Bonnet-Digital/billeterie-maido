-- Extend cart_items to support multiple product types
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS product_type text CHECK (product_type IN ('event_pass','park_offer')),
  ADD COLUMN IF NOT EXISTS product_id uuid;
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_type, product_id);
