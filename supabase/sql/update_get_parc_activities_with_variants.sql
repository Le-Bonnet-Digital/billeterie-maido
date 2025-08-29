-- Example SQL to extend the RPC so that it returns activities.parc_description
-- Adjust table/column names to match your schema if needed.

-- This recreates the function get_parc_activities_with_variants so it also
-- returns the column parc_description coming from activities.

-- NOTE: Run this in Supabase SQL editor or psql with an account that can
-- create/replace functions.

create or replace function public.get_parc_activities_with_variants()
returns table (
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
language sql
security definer
as $$
  select
    a.id,
    a.name,
    coalesce(a.description, '') as description,
    a.parc_description,
    a.icon,
    a.parc_category as category,
    coalesce(a.parc_requires_time_slot, false) as requires_time_slot,
    a.parc_image_url as image_url,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', v.id,
            'name', v.name,
            'price', v.price,
            'sort_order', coalesce(v.sort_order, 0),
            'remaining_stock', get_activity_variant_remaining_stock(v.id),
            'image_url', v.image_url
          )
          order by coalesce(v.sort_order, 0), v.name
        )
        from public.activity_variants v
        where v.activity_id = a.id and v.is_active = true
      ), '[]'::jsonb
    ) as variants
  from public.activities a
  where a.is_parc_product = true
  order by a.parc_sort_order, a.name;
$$;

comment on function public.get_parc_activities_with_variants() is
  'Returns park activities and their variants; now includes activities.parc_description for UI chips.';
