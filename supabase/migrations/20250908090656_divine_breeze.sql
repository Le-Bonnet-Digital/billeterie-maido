/*
  # Fix Function Search Path Security Warnings

  1. Security Fixes
    - Add `SET search_path = public` to all functions to prevent search path manipulation
    - Ensures functions always use the correct schema regardless of caller context

  2. Functions Updated
    - All public functions now have immutable search_path for security
    - Prevents potential SQL injection via search_path manipulation
*/

-- Fix search_path for all functions to address security warnings

CREATE OR REPLACE FUNCTION public.reserve_pass_with_stock_check(
  session_id text,
  pass_id uuid DEFAULT NULL,
  activities jsonb DEFAULT '[]'::jsonb,
  quantity integer DEFAULT 1,
  attendee_first_name text DEFAULT NULL,
  attendee_last_name text DEFAULT NULL,
  attendee_birth_year integer DEFAULT NULL,
  access_conditions_ack boolean DEFAULT false,
  product_type text DEFAULT 'event_pass',
  product_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO cart_items (
    session_id,
    pass_id,
    quantity,
    attendee_first_name,
    attendee_last_name,
    attendee_birth_year,
    access_conditions_ack,
    product_type,
    product_id
  ) VALUES (
    session_id,
    pass_id,
    quantity,
    attendee_first_name,
    attendee_last_name,
    attendee_birth_year,
    access_conditions_ack,
    product_type,
    product_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_total_timeslot_capacity(event_activity_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(capacity), 0)::integer
  FROM time_slots
  WHERE event_activity_id = event_activity_uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_pass_activity_remaining(pass_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MIN(get_event_activity_remaining_stock(pa.event_activity_id)), 0)::integer
  FROM pass_activities pa
  WHERE pa.pass_id = pass_uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_pass_effective_remaining_stock(pass_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT LEAST(
    get_pass_remaining_stock(pass_uuid),
    COALESCE(get_pass_max_stock_from_activities(pass_uuid), 999999)
  )::integer;
$$;

CREATE OR REPLACE FUNCTION public.get_pass_max_stock_from_activities(pass_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MIN(ea.stock_limit), 999999)::integer
  FROM pass_activities pa
  JOIN event_activities ea ON ea.id = pa.event_activity_id
  WHERE pa.pass_id = pass_uuid
    AND ea.stock_limit IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_pass_remaining_stock(pass_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT initial_stock FROM passes WHERE id = pass_uuid) - 
    (SELECT COUNT(*)::integer FROM reservations WHERE pass_id = pass_uuid AND payment_status = 'paid'),
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.get_event_passes_activities_stock(event_uuid uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
        'remaining_stock', get_event_activity_remaining_stock(ea.id),
        'activity', json_build_object(
          'id', a.id,
          'name', a.name,
          'description', a.description,
          'icon', a.icon
        )
      ))
      FROM event_activities ea
      JOIN activities a ON a.id = ea.activity_id
      WHERE ea.event_id = event_uuid
    ), '[]'::json)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_activity_variant_remaining_stock(variant_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT variant_stock FROM activity_variants WHERE id = variant_uuid) - 
    (SELECT COUNT(*)::integer FROM cart_items WHERE product_type = 'activity_variant' AND product_id = variant_uuid),
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_activity_stock_with_timeslots(event_activity_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE event_activities
  SET stock_limit = calculate_total_timeslot_capacity(event_activity_uuid)
  WHERE id = event_activity_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_sync_activity_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM sync_activity_stock_with_timeslots(OLD.event_activity_id);
    RETURN OLD;
  ELSE
    PERFORM sync_activity_stock_with_timeslots(NEW.event_activity_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_sync_on_requires_timeslot_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.requires_time_slot != NEW.requires_time_slot THEN
    IF NEW.requires_time_slot THEN
      PERFORM sync_activity_stock_with_timeslots(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_cart_items()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM cart_items 
  WHERE reserved_until < NOW();
$$;

CREATE OR REPLACE FUNCTION public.set_reservation_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reservation_number IS NULL THEN
    NEW.reservation_number := generate_reservation_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_slot_remaining_capacity(slot_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT capacity FROM time_slots WHERE id = slot_uuid) - 
    (SELECT COUNT(*)::integer FROM reservations WHERE time_slot_id = slot_uuid AND payment_status = 'paid'),
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_reservation_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'RES-' || 
         EXTRACT(YEAR FROM NOW())::text || '-' ||
         LPAD(EXTRACT(DOY FROM NOW())::text, 3, '0') || '-' ||
         LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
$$;

CREATE OR REPLACE FUNCTION public.role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM users WHERE id = auth.uid()),
    'client'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_activity_remaining_capacity(activity_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT stock_limit FROM event_activities WHERE id = activity_uuid) - 
    (SELECT COUNT(*)::integer FROM reservations r 
     JOIN time_slots ts ON ts.id = r.time_slot_id 
     WHERE ts.event_activity_id = activity_uuid AND r.payment_status = 'paid'),
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.can_reserve_pass(pass_uuid uuid, quantity_requested integer)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_pass_remaining_stock(pass_uuid) >= quantity_requested;
$$;

CREATE OR REPLACE FUNCTION public.get_event_activity_remaining_stock(event_activity_id_param uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT stock_limit FROM event_activities WHERE id = event_activity_id_param) - 
    (SELECT COUNT(*)::integer FROM reservations WHERE event_activity_id = event_activity_id_param AND payment_status = 'paid'),
    0
  );
$$;