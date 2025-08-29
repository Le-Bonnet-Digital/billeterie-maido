/*
  # Shop configuration for site-level product catalogs

  1. New Tables
    - shops: identifies a storefront (e.g., by domain), branding options
    - shop_products: configurable list of passes displayed in the shop

  2. Security
    - RLS enabled
    - Public SELECT to allow the frontend to read shop config
    - Admins (role = 'admin') can manage
*/

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE,
  name text NOT NULL,
  is_default boolean DEFAULT false,
  brand_primary_color text,
  brand_logo_url text,
  created_at timestamptz DEFAULT now()
);

-- Shop products table
CREATE TABLE IF NOT EXISTS shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  pass_id uuid REFERENCES passes(id) ON DELETE CASCADE,
  category text DEFAULT 'Billets du Parc',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, pass_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shop_products_shop_id ON shop_products(shop_id);

-- Enable RLS
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;

-- Policies: public can read, only admins can write
DROP POLICY IF EXISTS "Public can read shops" ON shops;
CREATE POLICY "Public can read shops"
  ON shops
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Admins can manage shops" ON shops;
CREATE POLICY "Admins can manage shops"
  ON shops
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Public can read shop products" ON shop_products;
CREATE POLICY "Public can read shop products"
  ON shop_products
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Admins can manage shop products" ON shop_products;
CREATE POLICY "Admins can manage shop products"
  ON shop_products
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

