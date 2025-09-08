set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_total_timeslot_capacity(event_activity_uuid uuid)
 RETURNS integer
 LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  total_capacity integer := 0;
BEGIN
  SELECT COALESCE(SUM(capacity), 0)
  INTO total_capacity
  FROM time_slots
  WHERE event_activity_id = event_activity_uuid;
  
  RETURN total_capacity;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_reserve_pass(pass_uuid uuid, quantity integer DEFAULT 1)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  effective_stock integer;
BEGIN
  SELECT get_pass_effective_remaining_stock(pass_uuid) INTO effective_stock;
  
  RETURN effective_stock >= quantity;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_cart_items()
 RETURNS void
 LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  DELETE FROM cart_items
  WHERE reserved_until <= now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_reservation_number()
 RETURNS text
 LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  RETURN 'RES' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 10000)::text, 4, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_activity_remaining_capacity(activity_resource_uuid uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  total_cap integer;
  used_cap integer;
BEGIN
  -- Get total capacity
  SELECT total_capacity INTO total_cap
  FROM activity_resources
  WHERE id = activity_resource_uuid;
  
  IF total_cap IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Count used capacity from all reservations for this activity resource
  SELECT COALESCE(SUM(1), 0) INTO used_cap
  FROM reservations r
  JOIN time_slots ts ON r.time_slot_id = ts.id
  WHERE ts.activity_resource_id = activity_resource_uuid
    AND r.payment_status = 'paid';
  
  RETURN GREATEST(0, total_cap - used_cap);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_event_activity_remaining_stock(event_activity_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    total_stock integer;
    reserved_count integer;
    cart_reserved_count integer;
    remaining_stock integer;
BEGIN
    -- Get the total stock limit for this event activity
    SELECT COALESCE(ea.stock_limit, 999999)
    INTO total_stock
    FROM event_activities ea
    WHERE ea.id = event_activity_id_param;
    
    -- If no stock limit is set, return a high number (unlimited)
    IF total_stock IS NULL THEN
        RETURN 999999;
    END IF;
    
    -- Count confirmed reservations for this event activity
    SELECT COALESCE(COUNT(*), 0)
    INTO reserved_count
    FROM reservations r
    WHERE r.event_activity_id = event_activity_id_param
    AND r.payment_status = 'paid';
    
    -- Count items currently in carts (temporary reservations)
    SELECT COALESCE(SUM(ci.quantity), 0)
    INTO cart_reserved_count
    FROM cart_items ci
    WHERE ci.event_activity_id = event_activity_id_param
    AND ci.reserved_until > NOW();
    
    -- Calculate remaining stock
    remaining_stock := total_stock - reserved_count - cart_reserved_count;
    
    -- Ensure we don't return negative values
    IF remaining_stock < 0 THEN
        remaining_stock := 0;
    END IF;
    
    RETURN remaining_stock;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_event_passes_activities_stock(event_uuid uuid)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT json_build_object(
    'passes', COALESCE((
      SELECT json_agg(json_build_object(
        'id', p.id,
        'name', p.name,
        'price', p.price,
        'description', p.description,
        'initial_stock', p.initial_stock,
        'remaining_stock', get_pass_remaining_stock(p.id)
      ))
      FROM passes p
      WHERE p.event_id = event_uuid
    ), '[]'::json),
    'event_activities', COALESCE((
      SELECT json_agg(json_build_object(
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
      FROM event_activities ea
      JOIN activities a ON a.id = ea.activity_id
      WHERE ea.event_id = event_uuid
    ), '[]'::json)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_parc_activities_with_variants()
 RETURNS TABLE(id uuid, name text, description text, parc_description text, icon text, category text, requires_time_slot boolean, image_url text, variants jsonb)
 LANGUAGE sql
 SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_pass_activity_remaining(pass_uuid uuid, activity_name text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  max_bookings integer;
  used_bookings integer;
BEGIN
  -- Get max bookings for this activity
  IF activity_name = 'poney' THEN
    SELECT poney_max_bookings INTO max_bookings
    FROM passes WHERE id = pass_uuid;
  ELSIF activity_name = 'tir_arc' THEN
    SELECT tir_arc_max_bookings INTO max_bookings
    FROM passes WHERE id = pass_uuid;
  ELSE
    RETURN 0;
  END IF;
  
  -- If no limit set, return a large number
  IF max_bookings IS NULL THEN
    RETURN 999999;
  END IF;
  
  -- Count used bookings for this pass and activity
  SELECT COALESCE(COUNT(*), 0) INTO used_bookings
  FROM reservations r
  JOIN time_slots ts ON r.time_slot_id = ts.id
  WHERE r.pass_id = pass_uuid
    AND ts.activity = activity_name
    AND r.payment_status = 'paid';
  
  RETURN GREATEST(0, max_bookings - used_bookings);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pass_effective_remaining_stock(pass_uuid uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  pass_stock integer;
  activity_max_stock integer;
BEGIN
  -- Récupérer le stock du pass lui-même
  SELECT get_pass_remaining_stock(pass_uuid) INTO pass_stock;
  
  -- Récupérer le stock maximum basé sur les activités
  SELECT get_pass_max_stock_from_activities(pass_uuid) INTO activity_max_stock;
  
  -- Retourner le minimum des deux
  RETURN LEAST(COALESCE(pass_stock, 999999), COALESCE(activity_max_stock, 999999));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pass_max_stock_from_activities(pass_uuid uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  min_activity_stock integer := 999999;
  activity_stock integer;
  activity_record RECORD;
BEGIN
  -- Parcourir toutes les activités liées au pass
  FOR activity_record IN
    SELECT ea.id, ea.stock_limit
    FROM pass_activities pa
    JOIN event_activities ea ON ea.id = pa.event_activity_id
    WHERE pa.pass_id = pass_uuid
  LOOP
    -- Si l'activité a une limite de stock
    IF activity_record.stock_limit IS NOT NULL THEN
      -- Calculer le stock restant pour cette activité
      SELECT get_event_activity_remaining_stock(activity_record.id) INTO activity_stock;
      
      -- Prendre le minimum
      IF activity_stock < min_activity_stock THEN
        min_activity_stock := activity_stock;
      END IF;
    END IF;
  END LOOP;
  
  RETURN min_activity_stock;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pass_remaining_stock(pass_uuid uuid)
 RETURNS integer
 LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  initial_stock_val integer;
  reserved_count integer;
  sold_count integer;
BEGIN
  -- Récupérer le stock initial
  SELECT initial_stock INTO initial_stock_val
  FROM passes
  WHERE id = pass_uuid;
  
  -- Si stock illimité, retourner une grande valeur
  IF initial_stock_val IS NULL THEN
    RETURN 999999;
  END IF;
  
  -- Compter les réservations dans le panier (non expirées)
  SELECT COALESCE(SUM(quantity), 0) INTO reserved_count
  FROM cart_items
  WHERE pass_id = pass_uuid
    AND reserved_until > now();
  
  -- Compter les réservations payées
  SELECT COUNT(*) INTO sold_count
  FROM reservations
  WHERE pass_id = pass_uuid
    AND payment_status = 'paid';
  
  -- Retourner le stock disponible
  RETURN GREATEST(0, initial_stock_val - reserved_count - sold_count);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_passes_with_activities(event_uuid uuid)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_slot_remaining_capacity(slot_uuid uuid)
 RETURNS integer
 LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  total_capacity integer;
  reserved_count integer;
  sold_count integer;
BEGIN
  -- Récupérer la capacité totale
  SELECT capacity INTO total_capacity
  FROM time_slots
  WHERE id = slot_uuid;
  
  -- Compter les réservations dans le panier (non expirées)
  SELECT COALESCE(SUM(quantity), 0) INTO reserved_count
  FROM cart_items
  WHERE time_slot_id = slot_uuid
    AND reserved_until > now();
  
  -- Compter les réservations payées
  SELECT COUNT(*) INTO sold_count
  FROM reservations
  WHERE time_slot_id = slot_uuid
    AND payment_status = 'paid';
  
  -- Retourner la capacité disponible
  RETURN GREATEST(0, total_capacity - reserved_count - sold_count);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.role()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(
    (SELECT users.role FROM users WHERE users.id = auth.uid()),
    'client'::text
  );
$function$
;

CREATE OR REPLACE FUNCTION public.set_reservation_number()
 RETURNS trigger
 LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.reservation_number := 'RES-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(EXTRACT(DOY FROM NOW())::text, 3, '0') || '-' || LPAD((RANDOM() * 9999)::int::text, 4, '0');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_activity_stock_with_timeslots(event_activity_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  total_capacity integer;
  requires_slots boolean;
BEGIN
  -- Vérifier si l'activité nécessite des créneaux
  SELECT requires_time_slot INTO requires_slots
  FROM event_activities
  WHERE id = event_activity_uuid;
  
  -- Si l'activité nécessite des créneaux, synchroniser le stock
  IF requires_slots THEN
    -- Calculer la capacité totale des créneaux
    total_capacity := calculate_total_timeslot_capacity(event_activity_uuid);
    
    -- Mettre à jour le stock limite de l'activité
    UPDATE event_activities
    SET stock_limit = CASE 
      WHEN total_capacity > 0 THEN total_capacity
      ELSE NULL
    END
    WHERE id = event_activity_uuid;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_sync_activity_stock()
 RETURNS trigger
 LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Synchroniser pour l'ancienne activité (en cas de UPDATE/DELETE)
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    PERFORM sync_activity_stock_with_timeslots(OLD.event_activity_id);
  END IF;
  
  -- Synchroniser pour la nouvelle activité (en cas d'INSERT/UPDATE)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM sync_activity_stock_with_timeslots(NEW.event_activity_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_sync_on_requires_timeslot_change()
 RETURNS trigger
 LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Si on active requires_time_slot, synchroniser avec les créneaux existants
  IF NEW.requires_time_slot = true AND (OLD.requires_time_slot = false OR OLD.requires_time_slot IS NULL) THEN
    PERFORM sync_activity_stock_with_timeslots(NEW.id);
  END IF;
  
  -- Si on désactive requires_time_slot, remettre le stock limite à NULL (stock illimité)
  IF NEW.requires_time_slot = false AND OLD.requires_time_slot = true THEN
    NEW.stock_limit := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$
;


