/*
  Park domain schema
  - park_offers: dedicated park tickets
  - park_offer_activities: composition by activities
  - park_time_slots: optional time slots per activity
  - cart_items extensions handled in separate migration
*/

-- Tables
CREATE TABLE IF NOT EXISTS park_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  description text DEFAULT '',
  initial_stock integer NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS park_offer_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  park_offer_id uuid NOT NULL REFERENCES park_offers(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE RESTRICT,
  requires_time_slot boolean DEFAULT false,
  stock_limit integer NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (park_offer_id, activity_id)
);

CREATE TABLE IF NOT EXISTS park_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  slot_time timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_park_offers_active_order ON park_offers(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_park_offer_activities_offer ON park_offer_activities(park_offer_id);
CREATE INDEX IF NOT EXISTS idx_park_offer_activities_activity ON park_offer_activities(activity_id);
CREATE INDEX IF NOT EXISTS idx_park_time_slots_activity_time ON park_time_slots(activity_id, slot_time);

-- RLS
ALTER TABLE park_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE park_offer_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE park_time_slots ENABLE ROW LEVEL SECURITY;

-- Policies: public read; admins manage
DROP POLICY IF EXISTS "Public read park_offers" ON park_offers;
CREATE POLICY "Public read park_offers"
  ON park_offers FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins manage park_offers" ON park_offers;
CREATE POLICY "Admins manage park_offers"
  ON park_offers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Public read park_offer_activities" ON park_offer_activities;
CREATE POLICY "Public read park_offer_activities"
  ON park_offer_activities FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins manage park_offer_activities" ON park_offer_activities;
CREATE POLICY "Admins manage park_offer_activities"
  ON park_offer_activities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Public read park_time_slots" ON park_time_slots;
CREATE POLICY "Public read park_time_slots"
  ON park_time_slots FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins manage park_time_slots" ON park_time_slots;
CREATE POLICY "Admins manage park_time_slots"
  ON park_time_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- RPCs
-- Remaining stock for a single park offer
DROP FUNCTION IF EXISTS get_park_offer_remaining_stock(uuid);
CREATE OR REPLACE FUNCTION get_park_offer_remaining_stock(offer_uuid uuid)
RETURNS integer AS $$
DECLARE
  stock_from_initial integer;
  reserved_count integer;
BEGIN
  SELECT initial_stock INTO stock_from_initial FROM park_offers WHERE id = offer_uuid;

  -- Basic reservation count from cart (ignores activity/slot constraints for now)
  SELECT COALESCE(SUM(quantity), 0) INTO reserved_count
  FROM cart_items
  WHERE product_type = 'park_offer'
    AND product_id = offer_uuid
    AND reserved_until > now();

  IF stock_from_initial IS NULL THEN
    -- unlimited at offer level; return a large sentinel (frontend interprets)
    RETURN 999999 - reserved_count;
  ELSE
    RETURN GREATEST(stock_from_initial - reserved_count, 0);
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- List park offers with computed remaining stock
DROP FUNCTION IF EXISTS get_park_offers_with_stock();
CREATE OR REPLACE FUNCTION get_park_offers_with_stock()
RETURNS json AS $$
  SELECT COALESCE(json_agg(json_build_object(
    'id', o.id,
    'name', o.name,
    'price', o.price,
    'description', o.description,
    'initial_stock', o.initial_stock,
    'remaining_stock', get_park_offer_remaining_stock(o.id)
  ) ORDER BY o.sort_order, o.created_at), '[]'::json)
  FROM park_offers o
  WHERE o.is_active = true;
$$ LANGUAGE sql STABLE;

