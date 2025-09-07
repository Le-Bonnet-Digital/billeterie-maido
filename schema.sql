


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."calculate_total_timeslot_capacity"("event_activity_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_capacity integer := 0;
BEGIN
  SELECT COALESCE(SUM(capacity), 0)
  INTO total_capacity
  FROM time_slots
  WHERE event_activity_id = event_activity_uuid;
  
  RETURN total_capacity;
END;
$$;


ALTER FUNCTION "public"."calculate_total_timeslot_capacity"("event_activity_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_reserve_pass"("pass_uuid" "uuid", "quantity" integer DEFAULT 1) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  effective_stock integer;
BEGIN
  SELECT get_pass_effective_remaining_stock(pass_uuid) INTO effective_stock;
  
  RETURN effective_stock >= quantity;
END;
$$;


ALTER FUNCTION "public"."can_reserve_pass"("pass_uuid" "uuid", "quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_cart_items"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM cart_items
  WHERE reserved_until <= now();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_cart_items"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_reservation_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN 'RES' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 10000)::text, 4, '0');
END;
$$;


ALTER FUNCTION "public"."generate_reservation_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_activity_remaining_capacity"("activity_resource_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_activity_remaining_capacity"("activity_resource_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_activity_variant_remaining_stock"("variant_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."get_activity_variant_remaining_stock"("variant_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_event_activity_remaining_stock"("event_activity_id_param" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_event_activity_remaining_stock"("event_activity_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_event_passes_activities_stock"("event_uuid" "uuid") RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
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
$$;


ALTER FUNCTION "public"."get_event_passes_activities_stock"("event_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_parc_activities_with_variants"() RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "parc_description" "text", "icon" "text", "category" "text", "requires_time_slot" boolean, "image_url" "text", "variants" "jsonb")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
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


ALTER FUNCTION "public"."get_parc_activities_with_variants"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_parc_activities_with_variants"() IS 'Returns park activities and their variants; now includes activities.parc_description for UI chips.';



CREATE OR REPLACE FUNCTION "public"."get_pass_activity_remaining"("pass_uuid" "uuid", "activity_name" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_pass_activity_remaining"("pass_uuid" "uuid", "activity_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pass_effective_remaining_stock"("pass_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_pass_effective_remaining_stock"("pass_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pass_max_stock_from_activities"("pass_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_pass_max_stock_from_activities"("pass_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pass_remaining_stock"("pass_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_pass_remaining_stock"("pass_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_slot_remaining_capacity"("slot_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_slot_remaining_capacity"("slot_uuid" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_passes_with_activities"("event_uuid" "uuid") RETURNS "json"
    LANGUAGE sql SECURITY DEFINER
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

ALTER FUNCTION "public"."get_passes_with_activities"("event_uuid" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_pass_with_stock_check"("session_id" "text", "pass_id" "uuid", "activities" "jsonb" DEFAULT '[]'::"jsonb", "quantity" integer DEFAULT 1, "attendee_first_name" "text" DEFAULT NULL::"text", "attendee_last_name" "text" DEFAULT NULL::"text", "attendee_birth_year" integer DEFAULT NULL::integer, "access_conditions_ack" boolean DEFAULT false, "product_type" "text" DEFAULT 'event_pass'::"text", "product_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  remaining integer;
  cart_item_uuid uuid;
  act RECORD;
BEGIN
  -- Lock and check pass stock
  IF pass_id IS NOT NULL THEN
    PERFORM 1 FROM passes WHERE id = pass_id FOR UPDATE;
    SELECT get_pass_remaining_stock(pass_id) INTO remaining;
    IF remaining < quantity THEN
      RAISE EXCEPTION 'insufficient_stock';
    END IF;
  END IF;

  -- Verify stock for each activity/time slot
  FOR act IN
    SELECT (value->>'event_activity_id')::uuid AS event_activity_id,
           (value->>'time_slot_id')::uuid AS time_slot_id
    FROM jsonb_array_elements(activities)
  LOOP
    PERFORM 1 FROM event_activities WHERE id = act.event_activity_id FOR UPDATE;
    SELECT get_event_activity_remaining_stock(act.event_activity_id) INTO remaining;
    IF remaining < quantity THEN
      RAISE EXCEPTION 'insufficient_activity_stock';
    END IF;
    IF act.time_slot_id IS NOT NULL THEN
      PERFORM 1 FROM time_slots WHERE id = act.time_slot_id FOR UPDATE;
      SELECT get_slot_remaining_capacity(act.time_slot_id) INTO remaining;
      IF remaining < quantity THEN
        RAISE EXCEPTION 'insufficient_slot_capacity';
      END IF;
    END IF;
  END LOOP;

  -- Insert cart item
  INSERT INTO cart_items(
    session_id,
    pass_id,
    time_slot_id,
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
    NULL,
    quantity,
    attendee_first_name,
    attendee_last_name,
    attendee_birth_year,
    access_conditions_ack,
    product_type,
    product_id
  )
  RETURNING id INTO cart_item_uuid;

  -- Insert activities
  FOR act IN
    SELECT (value->>'event_activity_id')::uuid AS event_activity_id,
           (value->>'time_slot_id')::uuid AS time_slot_id
    FROM jsonb_array_elements(activities)
  LOOP
    INSERT INTO cart_item_activities(cart_item_id, event_activity_id, time_slot_id)
    VALUES (cart_item_uuid, act.event_activity_id, act.time_slot_id);
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."reserve_pass_with_stock_check"("session_id" "text", "pass_id" "uuid", "activities" "jsonb", "quantity" integer, "attendee_first_name" "text", "attendee_last_name" "text", "attendee_birth_year" integer, "access_conditions_ack" boolean, "product_type" "text", "product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_pass_with_stock_check"("session_id" "text", "pass_id" "uuid", "time_slot_id" "uuid" DEFAULT NULL::"uuid", "quantity" integer DEFAULT 1, "attendee_first_name" "text" DEFAULT NULL::"text", "attendee_last_name" "text" DEFAULT NULL::"text", "attendee_birth_year" integer DEFAULT NULL::integer, "access_conditions_ack" boolean DEFAULT false, "product_type" "text" DEFAULT 'event_pass'::"text", "product_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  remaining integer;
BEGIN
  -- Lock the pass row to prevent concurrent modifications
  IF pass_id IS NOT NULL THEN
    PERFORM 1 FROM passes WHERE id = pass_id FOR UPDATE;
    -- Check remaining stock
    SELECT get_pass_remaining_stock(pass_id) INTO remaining;
    IF remaining < quantity THEN
      RAISE EXCEPTION 'insufficient_stock';
    END IF;
  END IF;

  -- Insert the cart item
  INSERT INTO cart_items(
    session_id,
    pass_id,
    time_slot_id,
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
    time_slot_id,
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


ALTER FUNCTION "public"."reserve_pass_with_stock_check"("session_id" "text", "pass_id" "uuid", "time_slot_id" "uuid", "quantity" integer, "attendee_first_name" "text", "attendee_last_name" "text", "attendee_birth_year" integer, "access_conditions_ack" boolean, "product_type" "text", "product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."role"() RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    (SELECT users.role FROM users WHERE users.id = auth.uid()),
    'client'::text
  );
$$;


ALTER FUNCTION "public"."role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_reservation_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.reservation_number := 'RES-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(EXTRACT(DOY FROM NOW())::text, 3, '0') || '-' || LPAD((RANDOM() * 9999)::int::text, 4, '0');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_reservation_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_activity_stock_with_timeslots"("event_activity_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_activity_stock_with_timeslots"("event_activity_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_sync_activity_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."trigger_sync_activity_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_sync_on_requires_timeslot_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."trigger_sync_on_requires_timeslot_change"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "icon" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_parc_product" boolean DEFAULT false,
    "parc_price" numeric(10,2),
    "parc_description" "text",
    "parc_category" "text",
    "parc_sort_order" integer DEFAULT 0,
    "parc_requires_time_slot" boolean DEFAULT false,
    "parc_image_url" "text"
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "event_activity_id" "uuid"
);


ALTER TABLE "public"."activity_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "variant_stock" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "image_url" "text"
);


ALTER TABLE "public"."activity_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_item_activities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "cart_item_id" "uuid" NOT NULL,
    "event_activity_id" "uuid" NOT NULL,
    "time_slot_id" "uuid"
);


ALTER TABLE "public"."cart_item_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "session_id" "text" NOT NULL,
    "pass_id" "uuid",
    "time_slot_id" "uuid",
    "quantity" integer DEFAULT 1 NOT NULL,
    "reserved_until" timestamp with time zone DEFAULT ("now"() + '00:10:00'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "event_activity_id" "uuid",
    "attendee_first_name" "text",
    "attendee_last_name" "text",
    "attendee_birth_year" integer,
    "access_conditions_ack" boolean DEFAULT false,
    "product_type" "text",
    "product_id" "uuid",
    CONSTRAINT "cart_items_product_type_check" CHECK (("product_type" = ANY (ARRAY['event_pass'::"text", 'activity_variant'::"text"])))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "activity_id" "uuid",
    "stock_limit" integer,
    "requires_time_slot" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_animations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "location" "text" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "capacity" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_animations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_faqs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "position" integer NOT NULL
);


ALTER TABLE "public"."event_faqs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "event_date" "date" NOT NULL,
    "sales_opening_date" timestamp with time zone NOT NULL,
    "sales_closing_date" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "cgv_content" "text" DEFAULT ''::"text",
    "faq_content" "text" DEFAULT ''::"text",
    "key_info_content" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "has_animations" boolean DEFAULT false,
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'finished'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."park_time_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "slot_time" timestamp with time zone NOT NULL,
    "capacity" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."park_time_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pass_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pass_id" "uuid",
    "event_activity_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pass_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."passes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_id" "uuid",
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "initial_stock" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_park" boolean DEFAULT false,
    "pass_type" "text",
    "guaranteed_runs" integer,
    CONSTRAINT "passes_pass_type_check" CHECK ((("pass_type" IS NULL) OR ("pass_type" = ANY (ARRAY['moins_8'::"text", 'plus_8'::"text", 'luge_seule'::"text", 'baby_poney'::"text"]))))
);


ALTER TABLE "public"."passes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation_validations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "activity" "text" NOT NULL,
    "validated_by" "uuid" NOT NULL,
    "validated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    "revoked_by" "uuid",
    "revoke_reason" text,
    CONSTRAINT "reservation_validations_activity_check" CHECK (("activity" = ANY (ARRAY['poney'::"text", 'tir_arc'::"text", 'luge_bracelet'::"text"])))
);


ALTER TABLE "public"."reservation_validations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reservation_number" "text" NOT NULL,
    "client_email" "text" NOT NULL,
    "pass_id" "uuid",
    "time_slot_id" "uuid",
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "event_activity_id" "uuid",
    CONSTRAINT "reservations_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['paid'::"text", 'pending'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."reservations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid",
    "pass_id" "uuid",
    "category" "text" DEFAULT 'Billets du Parc'::"text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shop_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shops" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain" "text",
    "name" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "brand_primary_color" "text",
    "brand_logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_slots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "slot_time" timestamp with time zone NOT NULL,
    "capacity" integer DEFAULT 15 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "pass_id" "uuid",
    "event_activity_id" "uuid" NOT NULL
);


ALTER TABLE "public"."time_slots" OWNER TO "postgres";


COMMENT ON COLUMN "public"."time_slots"."pass_id" IS 'Optional: Can be null if time slot applies to all passes containing the activity';



COMMENT ON COLUMN "public"."time_slots"."event_activity_id" IS 'Required: Links time slot to a specific activity within an event';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'client'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'pony_provider'::"text", 'archery_provider'::"text", 'luge_provider'::"text", 'atlm_collaborator'::"text", 'client'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "text" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_resources"
    ADD CONSTRAINT "activity_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_variants"
    ADD CONSTRAINT "activity_variants_activity_id_name_key" UNIQUE ("activity_id", "name");



ALTER TABLE ONLY "public"."activity_variants"
    ADD CONSTRAINT "activity_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_item_activities"
    ADD CONSTRAINT "cart_item_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_activities"
    ADD CONSTRAINT "event_activities_event_id_activity_id_key" UNIQUE ("event_id", "activity_id");



ALTER TABLE ONLY "public"."event_activities"
    ADD CONSTRAINT "event_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_animations"
    ADD CONSTRAINT "event_animations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_faqs"
    ADD CONSTRAINT "event_faqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."park_time_slots"
    ADD CONSTRAINT "park_time_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pass_activities"
    ADD CONSTRAINT "pass_activities_pass_id_event_activity_id_key" UNIQUE ("pass_id", "event_activity_id");



ALTER TABLE ONLY "public"."pass_activities"
    ADD CONSTRAINT "pass_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."passes"
    ADD CONSTRAINT "passes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_validations"
    ADD CONSTRAINT "reservation_validations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."reservation_validations"
    ADD CONSTRAINT "reservation_validations_reservation_activity_key" UNIQUE ("reservation_id", "activity");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_reservation_number_key" UNIQUE ("reservation_number");



ALTER TABLE ONLY "public"."shop_products"
    ADD CONSTRAINT "shop_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_products"
    ADD CONSTRAINT "shop_products_shop_id_pass_id_key" UNIQUE ("shop_id", "pass_id");



ALTER TABLE ONLY "public"."shops"
    ADD CONSTRAINT "shops_domain_key" UNIQUE ("domain");



ALTER TABLE ONLY "public"."shops"
    ADD CONSTRAINT "shops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_slots"
    ADD CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activity_variants_active_order" ON "public"."activity_variants" USING "btree" ("is_active", "sort_order");



CREATE INDEX "idx_activity_variants_activity" ON "public"."activity_variants" USING "btree" ("activity_id");



CREATE INDEX "idx_cart_items_product" ON "public"."cart_items" USING "btree" ("product_type", "product_id");



CREATE INDEX "idx_cart_items_reserved_until" ON "public"."cart_items" USING "btree" ("reserved_until");



CREATE INDEX "idx_cart_items_session" ON "public"."cart_items" USING "btree" ("session_id");



CREATE INDEX "idx_event_animations_active" ON "public"."event_animations" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_event_animations_event_id" ON "public"."event_animations" USING "btree" ("event_id");



CREATE INDEX "idx_event_animations_time" ON "public"."event_animations" USING "btree" ("start_time", "end_time");



CREATE INDEX "idx_event_faqs_event_id" ON "public"."event_faqs" USING "btree" ("event_id");



CREATE INDEX "idx_event_faqs_position" ON "public"."event_faqs" USING "btree" ("event_id", "position");



CREATE INDEX "idx_events_dates" ON "public"."events" USING "btree" ("event_date", "sales_opening_date", "sales_closing_date");



CREATE INDEX "idx_events_status" ON "public"."events" USING "btree" ("status");



CREATE INDEX "idx_park_time_slots_activity_time" ON "public"."park_time_slots" USING "btree" ("activity_id", "slot_time");



CREATE INDEX "idx_pass_activities_event_activity_id" ON "public"."pass_activities" USING "btree" ("event_activity_id");



CREATE INDEX "idx_pass_activities_pass_id" ON "public"."pass_activities" USING "btree" ("pass_id");



CREATE INDEX "idx_passes_event" ON "public"."passes" USING "btree" ("event_id");



CREATE INDEX "idx_passes_is_park" ON "public"."passes" USING "btree" ("is_park");



CREATE INDEX "idx_reservations_email" ON "public"."reservations" USING "btree" ("client_email");

CREATE INDEX "idx_reservation_validations_validated_at_desc" ON "public"."reservation_validations" USING "btree" ("validated_at" DESC);
CREATE INDEX "idx_reservation_validations_activity" ON "public"."reservation_validations" USING "btree" ("activity");
CREATE INDEX "idx_reservation_validations_validated_by" ON "public"."reservation_validations" USING "btree" ("validated_by");


CREATE INDEX "idx_shop_products_shop_id" ON "public"."shop_products" USING "btree" ("shop_id");



CREATE INDEX "idx_time_slots_event_activity_id" ON "public"."time_slots" USING "btree" ("event_activity_id");



CREATE INDEX "idx_time_slots_slot_time" ON "public"."time_slots" USING "btree" ("slot_time");



CREATE UNIQUE INDEX "ux_webhook_events_id" ON "public"."webhook_events" USING "btree" ("id");



CREATE OR REPLACE TRIGGER "trigger_set_reservation_number" BEFORE INSERT ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."set_reservation_number"();



CREATE OR REPLACE TRIGGER "trigger_sync_on_requires_timeslot_change" BEFORE UPDATE ON "public"."event_activities" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_sync_on_requires_timeslot_change"();



CREATE OR REPLACE TRIGGER "trigger_sync_stock_on_timeslot_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."time_slots" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_sync_activity_stock"();



ALTER TABLE ONLY "public"."activity_resources"
    ADD CONSTRAINT "activity_resources_event_activity_id_fkey" FOREIGN KEY ("event_activity_id") REFERENCES "public"."event_activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_resources"
    ADD CONSTRAINT "activity_resources_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_variants"
    ADD CONSTRAINT "activity_variants_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_item_activities"
    ADD CONSTRAINT "cart_item_activities_cart_item_id_fkey" FOREIGN KEY ("cart_item_id") REFERENCES "public"."cart_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_item_activities"
    ADD CONSTRAINT "cart_item_activities_event_activity_id_fkey" FOREIGN KEY ("event_activity_id") REFERENCES "public"."event_activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_item_activities"
    ADD CONSTRAINT "cart_item_activities_time_slot_id_fkey" FOREIGN KEY ("time_slot_id") REFERENCES "public"."time_slots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_event_activity_id_fkey" FOREIGN KEY ("event_activity_id") REFERENCES "public"."event_activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_time_slot_id_fkey" FOREIGN KEY ("time_slot_id") REFERENCES "public"."time_slots"("id");



ALTER TABLE ONLY "public"."event_activities"
    ADD CONSTRAINT "event_activities_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_activities"
    ADD CONSTRAINT "event_activities_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_animations"
    ADD CONSTRAINT "event_animations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_faqs"
    ADD CONSTRAINT "event_faqs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."park_time_slots"
    ADD CONSTRAINT "park_time_slots_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pass_activities"
    ADD CONSTRAINT "pass_activities_event_activity_id_fkey" FOREIGN KEY ("event_activity_id") REFERENCES "public"."event_activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pass_activities"
    ADD CONSTRAINT "pass_activities_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."passes"
    ADD CONSTRAINT "passes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_validations"
    ADD CONSTRAINT "reservation_validations_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_validations"
    ADD CONSTRAINT "reservation_validations_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_event_activity_id_fkey" FOREIGN KEY ("event_activity_id") REFERENCES "public"."event_activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_time_slot_id_fkey" FOREIGN KEY ("time_slot_id") REFERENCES "public"."time_slots"("id");



ALTER TABLE ONLY "public"."shop_products"
    ADD CONSTRAINT "shop_products_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_products"
    ADD CONSTRAINT "shop_products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_slots"
    ADD CONSTRAINT "time_slots_event_activity_id_fkey" FOREIGN KEY ("event_activity_id") REFERENCES "public"."event_activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_slots"
    ADD CONSTRAINT "time_slots_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage activities" ON "public"."activities" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage activity resources" ON "public"."activity_resources" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Staff can read reservations" ON "public"."reservations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::text,'pony_provider'::text,'archery_provider'::text,'luge_provider'::text,'atlm_collaborator'::text]))))));

CREATE POLICY "Admins can manage all reservations" ON "public"."reservations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage event FAQs" ON "public"."event_faqs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage event activities" ON "public"."event_activities" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage event animations" ON "public"."event_animations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage events" ON "public"."events" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage pass activities" ON "public"."pass_activities" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage passes" ON "public"."passes" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage shop products" ON "public"."shop_products" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage shops" ON "public"."shops" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage time slots" ON "public"."time_slots" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read all users" ON "public"."users" FOR SELECT TO "authenticated" USING ("public"."is_admin"());

CREATE POLICY "Staff can read users" ON "public"."users" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" u
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text,'pony_provider'::text,'archery_provider'::text,'luge_provider'::text,'atlm_collaborator'::text]))))));



CREATE POLICY "Admins can update users" ON "public"."users" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage park_time_slots" ON "public"."park_time_slots" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage variants" ON "public"."activity_variants" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Allow all operations on passes for development" ON "public"."passes" USING (true) WITH CHECK (true);



CREATE POLICY "Allow user creation during signup" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Anyone can manage their cart item activities" ON "public"."cart_item_activities" USING (true);



CREATE POLICY "Anyone can manage their cart items" ON "public"."cart_items" USING (true);



CREATE POLICY "Anyone can view FAQs for published events" ON "public"."event_faqs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_faqs"."event_id") AND ("events"."status" = 'published'::"text")))));



CREATE POLICY "Anyone can view active animations for published events" ON "public"."event_animations" FOR SELECT USING ((("is_active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_animations"."event_id") AND ("events"."status" = 'published'::"text"))))));



CREATE POLICY "Anyone can view activities" ON "public"."activities" FOR SELECT USING (true);



CREATE POLICY "Anyone can view activity resources for published events" ON "public"."activity_resources" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "activity_resources"."event_id") AND ("events"."status" = 'published'::"text")))));



CREATE POLICY "Anyone can view event activities for published events" ON "public"."event_activities" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_activities"."event_id") AND ("events"."status" = 'published'::"text")))));



CREATE POLICY "Anyone can view pass activities for published events" ON "public"."pass_activities" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."passes" "p"
     JOIN "public"."events" "e" ON (("e"."id" = "p"."event_id")))
  WHERE (("p"."id" = "pass_activities"."pass_id") AND ("e"."status" = 'published'::"text")))));



CREATE POLICY "Anyone can view passes for published events" ON "public"."passes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "passes"."event_id") AND ("events"."status" = 'published'::"text")))));



CREATE POLICY "Anyone can view published events" ON "public"."events" FOR SELECT USING (("status" = 'published'::"text"));



CREATE POLICY "Anyone can view time slots for published events" ON "public"."time_slots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."passes" "p"
     JOIN "public"."events" "e" ON (("e"."id" = "p"."event_id")))
  WHERE (("p"."id" = "time_slots"."pass_id") AND ("e"."status" = 'published'::"text")))));



CREATE POLICY "Providers can insert validations" ON "public"."reservation_validations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'pony_provider'::"text", 'archery_provider'::"text", 'luge_provider'::"text", 'atlm_collaborator'::"text"]))))));



CREATE POLICY "Providers can read validations" ON "public"."reservation_validations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'pony_provider'::"text", 'archery_provider'::"text", 'luge_provider'::"text", 'atlm_collaborator'::"text"]))))));

CREATE POLICY "Admins can revoke validations" ON "public"."reservation_validations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Public can read shop products" ON "public"."shop_products" FOR SELECT USING (true);



CREATE POLICY "Public can read shops" ON "public"."shops" FOR SELECT USING (true);



CREATE POLICY "Public read park_time_slots" ON "public"."park_time_slots" FOR SELECT USING (true);



CREATE POLICY "Public read variants" ON "public"."activity_variants" FOR SELECT USING (true);



CREATE POLICY "Service role can manage all events" ON "public"."events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all users" ON "public"."users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can read own data" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own data" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activity_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activity_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cart_item_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_animations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_faqs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."park_time_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pass_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."passes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation_validations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_total_timeslot_capacity"("event_activity_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_total_timeslot_capacity"("event_activity_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_total_timeslot_capacity"("event_activity_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_reserve_pass"("pass_uuid" "uuid", "quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."can_reserve_pass"("pass_uuid" "uuid", "quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_reserve_pass"("pass_uuid" "uuid", "quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_cart_items"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_cart_items"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_cart_items"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_reservation_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_reservation_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_reservation_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_activity_remaining_capacity"("activity_resource_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_activity_remaining_capacity"("activity_resource_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_activity_remaining_capacity"("activity_resource_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_activity_variant_remaining_stock"("variant_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_activity_variant_remaining_stock"("variant_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_activity_variant_remaining_stock"("variant_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_event_activity_remaining_stock"("event_activity_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_event_activity_remaining_stock"("event_activity_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_event_activity_remaining_stock"("event_activity_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_event_passes_activities_stock"("event_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_event_passes_activities_stock"("event_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_event_passes_activities_stock"("event_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_parc_activities_with_variants"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_parc_activities_with_variants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_parc_activities_with_variants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pass_activity_remaining"("pass_uuid" "uuid", "activity_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pass_activity_remaining"("pass_uuid" "uuid", "activity_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pass_activity_remaining"("pass_uuid" "uuid", "activity_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pass_effective_remaining_stock"("pass_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pass_effective_remaining_stock"("pass_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pass_effective_remaining_stock"("pass_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pass_max_stock_from_activities"("pass_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pass_max_stock_from_activities"("pass_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pass_max_stock_from_activities"("pass_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pass_remaining_stock"("pass_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pass_remaining_stock"("pass_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pass_remaining_stock"("pass_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_slot_remaining_capacity"("slot_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_slot_remaining_capacity"("slot_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_slot_remaining_capacity"("slot_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";

GRANT ALL ON FUNCTION "public"."get_passes_with_activities"("event_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_passes_with_activities"("event_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_passes_with_activities"("event_uuid" "uuid") TO "service_role";


GRANT ALL ON FUNCTION "public"."reserve_pass_with_stock_check"("session_id" "text", "pass_id" "uuid", "activities" "jsonb", "quantity" integer, "attendee_first_name" "text", "attendee_last_name" "text", "attendee_birth_year" integer, "access_conditions_ack" boolean, "product_type" "text", "product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_pass_with_stock_check"("session_id" "text", "pass_id" "uuid", "activities" "jsonb", "quantity" integer, "attendee_first_name" "text", "attendee_last_name" "text", "attendee_birth_year" integer, "access_conditions_ack" boolean, "product_type" "text", "product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_pass_with_stock_check"("session_id" "text", "pass_id" "uuid", "activities" "jsonb", "quantity" integer, "attendee_first_name" "text", "attendee_last_name" "text", "attendee_birth_year" integer, "access_conditions_ack" boolean, "product_type" "text", "product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reserve_pass_with_stock_check"("session_id" "text", "pass_id" "uuid", "time_slot_id" "uuid", "quantity" integer, "attendee_first_name" "text", "attendee_last_name" "text", "attendee_birth_year" integer, "access_conditions_ack" boolean, "product_type" "text", "product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_pass_with_stock_check"("session_id" "text", "pass_id" "uuid", "time_slot_id" "uuid", "quantity" integer, "attendee_first_name" "text", "attendee_last_name" "text", "attendee_birth_year" integer, "access_conditions_ack" boolean, "product_type" "text", "product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_pass_with_stock_check"("session_id" "text", "pass_id" "uuid", "time_slot_id" "uuid", "quantity" integer, "attendee_first_name" "text", "attendee_last_name" "text", "attendee_birth_year" integer, "access_conditions_ack" boolean, "product_type" "text", "product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."role"() TO "anon";
GRANT ALL ON FUNCTION "public"."role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_reservation_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_reservation_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_reservation_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_activity_stock_with_timeslots"("event_activity_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_activity_stock_with_timeslots"("event_activity_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_activity_stock_with_timeslots"("event_activity_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_sync_activity_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_sync_activity_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_sync_activity_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_sync_on_requires_timeslot_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_sync_on_requires_timeslot_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_sync_on_requires_timeslot_change"() TO "service_role";



GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."activity_resources" TO "anon";
GRANT ALL ON TABLE "public"."activity_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_resources" TO "service_role";



GRANT ALL ON TABLE "public"."activity_variants" TO "anon";
GRANT ALL ON TABLE "public"."activity_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_variants" TO "service_role";



GRANT ALL ON TABLE "public"."cart_item_activities" TO "anon";
GRANT ALL ON TABLE "public"."cart_item_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_item_activities" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."event_activities" TO "anon";
GRANT ALL ON TABLE "public"."event_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."event_activities" TO "service_role";



GRANT ALL ON TABLE "public"."event_animations" TO "anon";
GRANT ALL ON TABLE "public"."event_animations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_animations" TO "service_role";



GRANT ALL ON TABLE "public"."event_faqs" TO "anon";
GRANT ALL ON TABLE "public"."event_faqs" TO "authenticated";
GRANT ALL ON TABLE "public"."event_faqs" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."park_time_slots" TO "anon";
GRANT ALL ON TABLE "public"."park_time_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."park_time_slots" TO "service_role";



GRANT ALL ON TABLE "public"."pass_activities" TO "anon";
GRANT ALL ON TABLE "public"."pass_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."pass_activities" TO "service_role";



GRANT ALL ON TABLE "public"."passes" TO "anon";
GRANT ALL ON TABLE "public"."passes" TO "authenticated";
GRANT ALL ON TABLE "public"."passes" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_validations" TO "anon";
GRANT ALL ON TABLE "public"."reservation_validations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_validations" TO "service_role";



GRANT ALL ON TABLE "public"."reservations" TO "anon";
GRANT ALL ON TABLE "public"."reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservations" TO "service_role";



GRANT ALL ON TABLE "public"."shop_products" TO "anon";
GRANT ALL ON TABLE "public"."shop_products" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_products" TO "service_role";



GRANT ALL ON TABLE "public"."shops" TO "anon";
GRANT ALL ON TABLE "public"."shops" TO "authenticated";
GRANT ALL ON TABLE "public"."shops" TO "service_role";



GRANT ALL ON TABLE "public"."time_slots" TO "anon";
GRANT ALL ON TABLE "public"."time_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."time_slots" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






--
-- View: public.luge_validations_today
--
DROP VIEW IF EXISTS public.luge_validations_today;
CREATE VIEW public.luge_validations_today AS
 SELECT count(*) AS count
   FROM public.reservation_validations
  WHERE activity = 'luge_bracelet'::text
    AND validated_at::date = CURRENT_DATE;
GRANT ALL ON TABLE public.luge_validations_today TO postgres;
GRANT ALL ON TABLE public.luge_validations_today TO anon;
GRANT ALL ON TABLE public.luge_validations_today TO authenticated;
GRANT ALL ON TABLE public.luge_validations_today TO service_role;

RESET ALL;
