-- Images for Parc activities and variants
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS parc_image_url text;

ALTER TABLE activity_variants
  ADD COLUMN IF NOT EXISTS image_url text;

-- Recreate RPC to include image urls in payload
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
    'image_url', a.parc_image_url,
    'variants', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', v.id,
        'name', v.name,
        'price', v.price,
        'sort_order', v.sort_order,
        'remaining_stock', get_activity_variant_remaining_stock(v.id),
        'image_url', v.image_url
      ) ORDER BY v.sort_order, v.created_at), '[]'::json)
      FROM activity_variants v
      WHERE v.activity_id = a.id AND v.is_active = true
    )
  ) ORDER BY a.parc_sort_order, a.name), '[]'::json)
  FROM activities a
  WHERE a.is_parc_product = true;
$$ LANGUAGE sql STABLE;

