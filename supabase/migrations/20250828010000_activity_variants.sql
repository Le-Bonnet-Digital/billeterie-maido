-- Activity-first model: variants per activity for Parc
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS is_parc_product boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parc_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS parc_description text,
  ADD COLUMN IF NOT EXISTS parc_category text,
  ADD COLUMN IF NOT EXISTS parc_sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parc_requires_time_slot boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS activity_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  variant_stock integer NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(activity_id, name)
);

ALTER TABLE activity_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read variants" ON activity_variants;
CREATE POLICY "Public read variants"
  ON activity_variants FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins manage variants" ON activity_variants;
CREATE POLICY "Admins manage variants"
  ON activity_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_activity_variants_activity ON activity_variants(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_variants_active_order ON activity_variants(is_active, sort_order);

-- Remaining stock for a single variant based on its own stock minus reservations
DROP FUNCTION IF EXISTS get_activity_variant_remaining_stock(uuid);
CREATE OR REPLACE FUNCTION get_activity_variant_remaining_stock(variant_uuid uuid)
RETURNS integer AS $$
DECLARE
  stock_from_variant integer;
  reserved_count integer;
BEGIN
  SELECT variant_stock INTO stock_from_variant FROM activity_variants WHERE id = variant_uuid;
  -- reserved in cart
  SELECT COALESCE(SUM(quantity), 0) INTO reserved_count
  FROM cart_items
  WHERE product_type = 'activity_variant'
    AND product_id = variant_uuid
    AND reserved_until > now();

  IF stock_from_variant IS NULL THEN
    RETURN 999999 - reserved_count;
  ELSE
    RETURN GREATEST(stock_from_variant - reserved_count, 0);
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- List parc activities with variants and remaining stock
DROP FUNCTION IF EXISTS get_parc_activities_with_variants();
CREATE OR REPLACE FUNCTION get_parc_activities_with_variants()
RETURNS json AS $$
  SELECT COALESCE(json_agg(json_build_object(
    'id', a.id,
    'name', a.name,
    'description', a.parc_description,
    'icon', a.icon,
    'category', a.parc_category,
    'requires_time_slot', a.parc_requires_time_slot,
    'variants', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', v.id,
        'name', v.name,
        'price', v.price,
        'sort_order', v.sort_order,
        'remaining_stock', get_activity_variant_remaining_stock(v.id)
      ) ORDER BY v.sort_order, v.created_at), '[]'::json)
      FROM activity_variants v
      WHERE v.activity_id = a.id AND v.is_active = true
    )
  ) ORDER BY a.parc_sort_order, a.name), '[]'::json)
  FROM activities a
  WHERE a.is_parc_product = true;
$$ LANGUAGE sql STABLE;

