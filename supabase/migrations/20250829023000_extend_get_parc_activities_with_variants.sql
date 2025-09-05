-- Migration: extend get_parc_activities_with_variants to include activities.parc_description
-- Idempotent: on supprime d'abord toute version existante (même signature), puis on recrée.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_parc_activities_with_variants'
      AND p.pronargs = 0  -- aucune argument
  ) THEN
    DROP FUNCTION public.get_parc_activities_with_variants();
    -- Si tu sais qu'il n'y a pas de dépendances: tu peux aussi faire CASCADE
    -- DROP FUNCTION public.get_parc_activities_with_variants() CASCADE;
  END IF;
END
$$;

CREATE FUNCTION public.get_parc_activities_with_variants()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  parc_description text,
  icon text,
  category text,
  requires_time_slot boolean,
  image_url text,
  variants jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.name,
    COALESCE(a.description, '') AS description,
    a.parc_description,
    a.icon,
    a.parc_category AS category,
    COALESCE(a.parc_requires_time_slot, false) AS requires_time_slot,
    a.parc_image_url AS image_url,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', v.id,
            'name', v.name,
            'price', v.price,
            'sort_order', COALESCE(v.sort_order, 0),
            'remaining_stock', get_activity_variant_remaining_stock(v.id),
            'image_url', v.image_url
          )
          ORDER BY COALESCE(v.sort_order, 0), v.name
        )
        FROM public.activity_variants v
        WHERE v.activity_id = a.id AND v.is_active = true
      ), '[]'::jsonb
    ) AS variants
  FROM public.activities a
  WHERE a.is_parc_product = true
  ORDER BY a.parc_sort_order, a.name;
$$;

-- (Optionnel) Donner les droits d'exécution si besoin :
-- GRANT EXECUTE ON FUNCTION public.get_parc_activities_with_variants() TO anon, authenticated, service_role;
