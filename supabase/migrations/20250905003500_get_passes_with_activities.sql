-- Function to retrieve passes with their activities and remaining stock
CREATE OR REPLACE FUNCTION get_passes_with_activities(event_uuid uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  select coalesce(json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'price', p.price,
      'description', p.description,
      'initial_stock', p.initial_stock,
      'pass_type', p.pass_type,
      'guaranteed_runs', p.guaranteed_runs,
      'remaining_stock', get_pass_remaining_stock(p.id),
      'event_activities', coalesce((
        select json_agg(json_build_object(
          'id', ea.id,
          'activity_id', ea.activity_id,
          'stock_limit', ea.stock_limit,
          'requires_time_slot', ea.requires_time_slot,
          'activity', json_build_object(
            'id', a.id,
            'name', a.name,
            'description', a.description,
            'icon', a.icon
          ),
          'remaining_stock', get_event_activity_remaining_stock(ea.id)
        ))
        from event_activities ea
        join activities a on a.id = ea.activity_id
        join pass_activities pa on pa.event_activity_id = ea.id
        where pa.pass_id = p.id
      ), '[]'::json)
    ) order by p.name
  ), '[]'::json)
  from passes p
  where p.event_id = event_uuid;
$$;

GRANT EXECUTE ON FUNCTION get_passes_with_activities(uuid) TO authenticated, anon, service_role;
