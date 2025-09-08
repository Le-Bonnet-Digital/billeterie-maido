--
-- PostgreSQL database dump
--

\restrict 4Vk2t8Inb5okK2fZPiYsVQt8XOiRUdI2TMfwYXHc3LkZTX1AB3gftkddgdajVY1

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.6

-- Started on 2025-09-08 16:40:59

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 14 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- TOC entry 4076 (class 0 OID 0)
-- Dependencies: 14
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 453 (class 1255 OID 18998)
-- Name: calculate_total_timeslot_capacity(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_total_timeslot_capacity(event_activity_uuid uuid) RETURNS integer
    LANGUAGE plpgsql
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


--
-- TOC entry 451 (class 1255 OID 17891)
-- Name: can_reserve_pass(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_reserve_pass(pass_uuid uuid, quantity integer DEFAULT 1) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  effective_stock integer;
BEGIN
  SELECT get_pass_effective_remaining_stock(pass_uuid) INTO effective_stock;
  
  RETURN effective_stock >= quantity;
END;
$$;


--
-- TOC entry 444 (class 1255 OID 17617)
-- Name: cleanup_expired_cart_items(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_cart_items() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM cart_items
  WHERE reserved_until <= now();
END;
$$;


--
-- TOC entry 441 (class 1255 OID 17401)
-- Name: generate_reservation_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_reservation_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN 'RES' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 10000)::text, 4, '0');
END;
$$;


--
-- TOC entry 447 (class 1255 OID 17801)
-- Name: get_activity_remaining_capacity(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_activity_remaining_capacity(activity_resource_uuid uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- TOC entry 458 (class 1255 OID 22629)
-- Name: get_activity_variant_remaining_stock(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_activity_variant_remaining_stock(variant_uuid uuid) RETURNS integer
    LANGUAGE plpgsql STABLE
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


--
-- TOC entry 452 (class 1255 OID 17892)
-- Name: get_event_activity_remaining_stock(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_event_activity_remaining_stock(event_activity_id_param uuid) RETURNS integer
    LANGUAGE plpgsql
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


--
-- TOC entry 457 (class 1255 OID 20226)
-- Name: get_event_passes_activities_stock(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_event_passes_activities_stock(event_uuid uuid) RETURNS json
    LANGUAGE sql SECURITY DEFINER
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


--
-- TOC entry 473 (class 1255 OID 23889)
-- Name: get_parc_activities_with_variants(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_parc_activities_with_variants() RETURNS TABLE(id uuid, name text, description text, parc_description text, icon text, category text, requires_time_slot boolean, image_url text, variants jsonb)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- TOC entry 4077 (class 0 OID 0)
-- Dependencies: 473
-- Name: FUNCTION get_parc_activities_with_variants(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_parc_activities_with_variants() IS 'Returns park activities and their variants; now includes activities.parc_description for UI chips.';


--
-- TOC entry 448 (class 1255 OID 17802)
-- Name: get_pass_activity_remaining(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pass_activity_remaining(pass_uuid uuid, activity_name text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- TOC entry 450 (class 1255 OID 17890)
-- Name: get_pass_effective_remaining_stock(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pass_effective_remaining_stock(pass_uuid uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- TOC entry 449 (class 1255 OID 17889)
-- Name: get_pass_max_stock_from_activities(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pass_max_stock_from_activities(pass_uuid uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- TOC entry 442 (class 1255 OID 17615)
-- Name: get_pass_remaining_stock(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pass_remaining_stock(pass_uuid uuid) RETURNS integer
    LANGUAGE plpgsql
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


--
-- TOC entry 483 (class 1255 OID 31838)
-- Name: get_passes_with_activities(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_passes_with_activities(event_uuid uuid) RETURNS json
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- TOC entry 443 (class 1255 OID 17616)
-- Name: get_slot_remaining_capacity(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_slot_remaining_capacity(slot_uuid uuid) RETURNS integer
    LANGUAGE plpgsql
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


--
-- TOC entry 484 (class 1255 OID 35349)
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users au
    JOIN public.users u ON au.id = u.id
    WHERE au.id = auth.uid() 
    AND u.role = 'admin'
  );
$$;


--
-- TOC entry 482 (class 1255 OID 26271)
-- Name: reserve_pass_with_stock_check(text, uuid, jsonb, integer, text, text, integer, boolean, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_pass_with_stock_check(session_id text, pass_id uuid, activities jsonb DEFAULT '[]'::jsonb, quantity integer DEFAULT 1, attendee_first_name text DEFAULT NULL::text, attendee_last_name text DEFAULT NULL::text, attendee_birth_year integer DEFAULT NULL::integer, access_conditions_ack boolean DEFAULT false, product_type text DEFAULT 'event_pass'::text, product_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- TOC entry 474 (class 1255 OID 26111)
-- Name: reserve_pass_with_stock_check(text, uuid, uuid, integer, text, text, integer, boolean, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_pass_with_stock_check(session_id text, pass_id uuid, time_slot_id uuid DEFAULT NULL::uuid, quantity integer DEFAULT 1, attendee_first_name text DEFAULT NULL::text, attendee_last_name text DEFAULT NULL::text, attendee_birth_year integer DEFAULT NULL::integer, access_conditions_ack boolean DEFAULT false, product_type text DEFAULT 'event_pass'::text, product_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- TOC entry 446 (class 1255 OID 17733)
-- Name: role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.role() RETURNS text
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    (SELECT users.role FROM users WHERE users.id = auth.uid()),
    'client'::text
  );
$$;


--
-- TOC entry 445 (class 1255 OID 17618)
-- Name: set_reservation_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_reservation_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.reservation_number := 'RES-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(EXTRACT(DOY FROM NOW())::text, 3, '0') || '-' || LPAD((RANDOM() * 9999)::int::text, 4, '0');
  RETURN NEW;
END;
$$;


--
-- TOC entry 454 (class 1255 OID 18999)
-- Name: sync_activity_stock_with_timeslots(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_activity_stock_with_timeslots(event_activity_uuid uuid) RETURNS void
    LANGUAGE plpgsql
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


--
-- TOC entry 455 (class 1255 OID 19000)
-- Name: trigger_sync_activity_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_sync_activity_stock() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- TOC entry 456 (class 1255 OID 19002)
-- Name: trigger_sync_on_requires_timeslot_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_sync_on_requires_timeslot_change() RETURNS trigger
    LANGUAGE plpgsql
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 315 (class 1259 OID 17806)
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    icon text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    is_parc_product boolean DEFAULT false,
    parc_price numeric(10,2),
    parc_description text,
    parc_category text,
    parc_sort_order integer DEFAULT 0,
    parc_requires_time_slot boolean DEFAULT false,
    parc_image_url text
);


--
-- TOC entry 314 (class 1259 OID 17775)
-- Name: activity_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    event_activity_id uuid
);


--
-- TOC entry 324 (class 1259 OID 22606)
-- Name: activity_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_id uuid NOT NULL,
    name text NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    variant_stock integer,
    created_at timestamp with time zone DEFAULT now(),
    image_url text
);


--
-- TOC entry 333 (class 1259 OID 26249)
-- Name: cart_item_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_item_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_item_id uuid NOT NULL,
    event_activity_id uuid NOT NULL,
    time_slot_id uuid
);


--
-- TOC entry 313 (class 1259 OID 17591)
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    pass_id uuid,
    time_slot_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    reserved_until timestamp with time zone DEFAULT (now() + '00:10:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    event_activity_id uuid,
    attendee_first_name text,
    attendee_last_name text,
    attendee_birth_year integer,
    access_conditions_ack boolean DEFAULT false,
    product_type text,
    product_id uuid,
    CONSTRAINT cart_items_product_type_check CHECK ((product_type = ANY (ARRAY['event_pass'::text, 'activity_variant'::text])))
);


--
-- TOC entry 316 (class 1259 OID 17819)
-- Name: event_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    activity_id uuid,
    stock_limit integer,
    requires_time_slot boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 318 (class 1259 OID 20111)
-- Name: event_animations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_animations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    name text NOT NULL,
    description text DEFAULT ''::text,
    location text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    capacity integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 319 (class 1259 OID 20208)
-- Name: event_faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    question text NOT NULL,
    answer text NOT NULL,
    "position" integer NOT NULL
);


--
-- TOC entry 309 (class 1259 OID 17496)
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    event_date date NOT NULL,
    sales_opening_date timestamp with time zone NOT NULL,
    sales_closing_date timestamp with time zone NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    cgv_content text DEFAULT ''::text,
    faq_content text DEFAULT ''::text,
    key_info_content text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    has_animations boolean DEFAULT false,
    CONSTRAINT events_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'finished'::text, 'cancelled'::text])))
);


--
-- TOC entry 327 (class 1259 OID 23851)
-- Name: reservation_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservation_validations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reservation_id uuid NOT NULL,
    activity text NOT NULL,
    validated_by uuid NOT NULL,
    validated_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    revoked_by uuid,
    revoke_reason text,
    CONSTRAINT reservation_validations_activity_check CHECK ((activity = ANY (ARRAY['poney'::text, 'tir_arc'::text, 'luge_bracelet'::text])))
);


--
-- TOC entry 336 (class 1259 OID 35334)
-- Name: luge_validations_today; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.luge_validations_today WITH (security_invoker='true') AS
 SELECT count(*) AS count
   FROM public.reservation_validations
  WHERE ((activity = 'luge_bracelet'::text) AND ((validated_at)::date = CURRENT_DATE));


--
-- TOC entry 323 (class 1259 OID 22575)
-- Name: park_time_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.park_time_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_id uuid NOT NULL,
    slot_time timestamp with time zone NOT NULL,
    capacity integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 317 (class 1259 OID 17859)
-- Name: pass_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pass_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pass_id uuid,
    event_activity_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 310 (class 1259 OID 17515)
-- Name: passes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.passes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    description text DEFAULT ''::text,
    initial_stock integer,
    created_at timestamp with time zone DEFAULT now(),
    is_park boolean DEFAULT false,
    pass_type text,
    guaranteed_runs integer,
    CONSTRAINT passes_pass_type_check CHECK (((pass_type IS NULL) OR (pass_type = ANY (ARRAY['moins_8'::text, 'plus_8'::text, 'luge_seule'::text, 'baby_poney'::text]))))
);


--
-- TOC entry 312 (class 1259 OID 17565)
-- Name: reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reservation_number text NOT NULL,
    client_email text NOT NULL,
    pass_id uuid,
    time_slot_id uuid,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    event_activity_id uuid,
    CONSTRAINT reservations_payment_status_check CHECK ((payment_status = ANY (ARRAY['paid'::text, 'pending'::text, 'refunded'::text])))
);


--
-- TOC entry 322 (class 1259 OID 22508)
-- Name: shop_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid,
    pass_id uuid,
    category text DEFAULT 'Billets du Parc'::text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 321 (class 1259 OID 22496)
-- Name: shops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain text,
    name text NOT NULL,
    is_default boolean DEFAULT false,
    brand_primary_color text,
    brand_logo_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 335 (class 1259 OID 31827)
-- Name: stripe_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_sessions (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 311 (class 1259 OID 17533)
-- Name: time_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot_time timestamp with time zone NOT NULL,
    capacity integer DEFAULT 15 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    pass_id uuid,
    event_activity_id uuid NOT NULL
);


--
-- TOC entry 4078 (class 0 OID 0)
-- Dependencies: 311
-- Name: COLUMN time_slots.pass_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_slots.pass_id IS 'Optional: Can be null if time slot applies to all passes containing the activity';


--
-- TOC entry 4079 (class 0 OID 0)
-- Dependencies: 311
-- Name: COLUMN time_slots.event_activity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_slots.event_activity_id IS 'Required: Links time slot to a specific activity within an event';


--
-- TOC entry 308 (class 1259 OID 17481)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT auth.uid() NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'client'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'pony_provider'::text, 'archery_provider'::text, 'luge_provider'::text, 'atlm_collaborator'::text, 'client'::text])))
);


--
-- TOC entry 332 (class 1259 OID 26169)
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_events (
    id text NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 4058 (class 0 OID 17806)
-- Dependencies: 315
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activities (id, name, description, icon, created_at, is_parc_product, parc_price, parc_description, parc_category, parc_sort_order, parc_requires_time_slot, parc_image_url) FROM stdin;
722a8277-fa51-4b60-9733-90cfcb719d1c	Luge d'été	À partir de 2 ans et jusqu'à 1m40 ➡️ avec un adulte.\nÀ partir de 1m40 ➡️ seul.	🛷	2025-08-24 00:11:36.979493+00	t	\N	\N	\N	1	f	https://rvotxqsgaolddvpqbkhy.supabase.co/storage/v1/object/public/activities/activities/cac81893-f434-475c-b7dc-c0574884c3bb.jpg
e4e8d471-1769-4c3e-b2d9-ca1cae6d2b16	Tir à l'arc	À partir de 8 ans	🏹	2025-08-23 23:48:31.366402+00	t	\N	• Taille minimale 1m20.	\N	4	f	https://rvotxqsgaolddvpqbkhy.supabase.co/storage/v1/object/public/activities/activities/d0afc822-af56-44d2-a91f-8b9f32d03415.jpg
e548a30b-b92f-40a0-b3b1-cc2a40072e13	Trottinettes électriques Tout-Terrain	À partir de 7 ans	🛴	2025-08-28 01:53:03.650661+00	t	\N	• Caution obligatoire; • À partir de 7 ans; • Savoir faire du vélo; • Casque obligatoire (fourni sur place)	\N	2	f	https://rvotxqsgaolddvpqbkhy.supabase.co/storage/v1/object/public/activities/activities/f8243177-59bc-41df-845c-361161e42f39.jpg
6bc3a66f-f77f-4b84-b4f0-61cd58d0357f	Poney	À partir de 9 mois 1/2 et jusqu'à 40kg	🐴	2025-08-23 23:48:31.366402+00	t	\N	• À partir de 9 mois et demi; • Poids maximum 40 kg; • Casque d’équitation obligatoire (fourni sur place).	\N	3	f	https://rvotxqsgaolddvpqbkhy.supabase.co/storage/v1/object/public/activities/activities/1864c7a9-94a6-4471-8fcc-fee058ecedb3.jpg
\.


--
-- TOC entry 4057 (class 0 OID 17775)
-- Dependencies: 314
-- Data for Name: activity_resources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_resources (id, event_id, created_at, event_activity_id) FROM stdin;
4923b784-51db-4e95-8db4-fcd09723d8bd	550e8400-e29b-41d4-a716-446655440000	2025-08-23 23:33:31.133319+00	\N
fc50ebbb-756b-4b49-9f5c-934087eb764b	550e8400-e29b-41d4-a716-446655440000	2025-08-23 23:33:31.133319+00	\N
\.


--
-- TOC entry 4066 (class 0 OID 22606)
-- Dependencies: 324
-- Data for Name: activity_variants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_variants (id, activity_id, name, price, is_active, sort_order, variant_stock, created_at, image_url) FROM stdin;
547096c0-2b04-47be-a33b-90ea1b3b7505	e4e8d471-1769-4c3e-b2d9-ca1cae6d2b16	Session de 20 minutes	6.00	t	0	\N	2025-08-28 01:36:53.748202+00	\N
3a6e4fc1-0000-40c0-83be-bc7caf90c3e4	e548a30b-b92f-40a0-b3b1-cc2a40072e13	Session de 20 minutes sur piste	15.00	t	0	\N	2025-08-28 01:53:37.15401+00	\N
15cd5ef3-105b-428a-a9cc-dfd8d2845a3a	6bc3a66f-f77f-4b84-b4f0-61cd58d0357f	La balade	5.00	t	0	\N	2025-08-28 01:35:38.953727+00	\N
864e36a5-f379-4b46-9bf9-029192fb28a0	722a8277-fa51-4b60-9733-90cfcb719d1c	Ticket 1 Tour	3.00	t	0	\N	2025-08-28 00:57:19.764631+00	\N
24cfe33c-9849-4813-989f-e921070b8044	722a8277-fa51-4b60-9733-90cfcb719d1c	Forfait 4 Tours	11.00	t	1	\N	2025-08-28 01:34:01.379842+00	\N
ed6d22da-7471-4355-91f5-1af96d716871	722a8277-fa51-4b60-9733-90cfcb719d1c	Forfait 10 Tours	25.00	t	2	\N	2025-08-28 01:34:28.298384+00	\N
\.


--
-- TOC entry 4069 (class 0 OID 26249)
-- Dependencies: 333
-- Data for Name: cart_item_activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_item_activities (id, cart_item_id, event_activity_id, time_slot_id) FROM stdin;
\.


--
-- TOC entry 4056 (class 0 OID 17591)
-- Dependencies: 313
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_items (id, session_id, pass_id, time_slot_id, quantity, reserved_until, created_at, event_activity_id, attendee_first_name, attendee_last_name, attendee_birth_year, access_conditions_ack, product_type, product_id) FROM stdin;
\.


--
-- TOC entry 4059 (class 0 OID 17819)
-- Dependencies: 316
-- Data for Name: event_activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_activities (id, event_id, activity_id, stock_limit, requires_time_slot, created_at) FROM stdin;
46582e48-2a74-491b-af56-2f8ac3002d83	550e8400-e29b-41d4-a716-446655440000	e4e8d471-1769-4c3e-b2d9-ca1cae6d2b16	285	t	2025-08-23 23:50:02.767386+00
99264814-637e-4117-899d-b305b1343241	550e8400-e29b-41d4-a716-446655440000	722a8277-fa51-4b60-9733-90cfcb719d1c	\N	f	2025-08-24 00:13:34.600187+00
a2974b53-d11a-45ec-87f7-6e7976c26a13	550e8400-e29b-41d4-a716-446655440000	6bc3a66f-f77f-4b84-b4f0-61cd58d0357f	120	t	2025-08-23 23:49:07.050137+00
\.


--
-- TOC entry 4061 (class 0 OID 20111)
-- Dependencies: 318
-- Data for Name: event_animations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_animations (id, event_id, name, description, location, start_time, end_time, capacity, is_active, created_at) FROM stdin;
8a3b0819-20c2-4494-8bc6-9a62b5103c94	550e8400-e29b-41d4-a716-446655440000	Course Gony	Dès 5 ans. 	Mare aux canards	2025-08-25 07:30:00+00	2025-08-25 08:30:00+00	\N	t	2025-08-25 15:44:05.170443+00
b24b8e08-9e1e-4dc7-95b1-49ea35292d51	550e8400-e29b-41d4-a716-446655440000	Kapot la mok	Tout âges	Chapiteau	2025-08-30 09:30:00+00	2025-08-30 10:30:00+00	\N	t	2025-08-25 15:46:19.745327+00
14c4a74c-47f2-4580-9310-2fa8326df857	550e8400-e29b-41d4-a716-446655440000	Serveur Péi		Mare aux canards	2025-08-30 10:30:00+00	2025-08-30 11:30:00+00	\N	t	2025-08-25 15:47:14.501408+00
ce928356-4e5b-46ab-bdce-dab11e5c2cb9	550e8400-e29b-41d4-a716-446655440000	Course la roue		Mare aux canards	2025-08-30 12:00:00+00	2025-08-30 13:00:00+00	\N	t	2025-08-25 15:47:48.541425+00
67e51718-2567-48e4-8aa9-b679cd16da62	550e8400-e29b-41d4-a716-446655440000	Kriké-Kraké		Toboggan	2025-08-30 13:00:00+00	2025-08-30 14:00:00+00	\N	t	2025-08-25 15:48:48.514723+00
\.


--
-- TOC entry 4062 (class 0 OID 20208)
-- Dependencies: 319
-- Data for Name: event_faqs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_faqs (id, event_id, question, answer, "position") FROM stdin;
\.


--
-- TOC entry 4052 (class 0 OID 17496)
-- Dependencies: 309
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.events (id, name, event_date, sales_opening_date, sales_closing_date, status, cgv_content, faq_content, key_info_content, created_at, updated_at, has_animations) FROM stdin;
550e8400-e29b-41d4-a716-446655440000	ANIMATION VILLAGE LONTAN	2025-09-14	2025-08-24 19:00:00+00	2025-09-14 12:00:00+00	published	Conditions Générales de Vente\n\n### Article 1 - Objet\nLes présentes conditions générales de vente régissent la vente de billets pour l'événement "Les Défis Lontan".\n\n### Article 2 - Prix\nLes prix sont indiqués en euros TTC. Le paiement s'effectue en ligne de manière sécurisée.\n\n### Article 3 - Annulation\nAucun remboursement ne sera effectué sauf en cas d'annulation de l'événement par l'organisateur.\n\n### Article 4 - Responsabilité\nL'organisateur décline toute responsabilité en cas d'accident lors de l'événement.	Questions Fréquemment Posées\n\n### Informations Générales\n\n**Q : "Où se déroule l'événement ?"**\n**R : "L'événement a lieu au Parc des Palmistes à Saint-Benoit, Réunion."**\n\n**Q : "À quelle heure commence l'événement ?"**\n**R : "L'événement débute à 9h00 et se termine à 17h00."**\n\n**Q : "Y a-t-il un parking disponible ?"**\n**R : "Oui, un parking gratuit est disponible sur place."**\n\n### Billets et Réservations\n\n**Q : "Puis-je modifier ma réservation ?"**\n**R : "Les modifications ne sont pas possibles une fois la réservation confirmée."**\n\n**Q : "Comment recevoir mes billets ?"**\n**R : "Vos billets vous seront envoyés par e-mail après confirmation du paiement."**\n\n**Q : "Que faire si je perds mes billets ?"**\n**R : "Utilisez la fonction 'Retrouver mon billet' sur notre site avec votre adresse e-mail."**\n\n### Activités\n\n**Q : "À partir de quel âge peut-on faire du poney ?"**\n**R : "L'activité poney est accessible dès 3 ans, avec accompagnement obligatoire pour les moins de 8 ans."**\n\n**Q : "Le tir à l'arc est-il sécurisé ?"**\n**R : "Oui, l'activité est encadrée par des moniteurs diplômés avec tout l'équipement de sécurité."**	Venez vivre une journée exceptionnelle au cœur de la nature réunionnaise ! \n\n🏇 **Activités Poney** : Découverte et balade pour tous les âges\n🏹 **Tir à l'Arc** : Initiation et perfectionnement avec des moniteurs diplômés\n🌿 **Cadre naturel** : Au Parc des Palmistes, un écrin de verdure unique\n\n**Horaires :** 9h00 - 17h00\n**Lieu :** Parc des Palmistes, Saint-Benoit\n**Parking gratuit** sur place\n\nUne expérience familiale inoubliable dans un cadre exceptionnel !	2025-08-23 08:37:30.178176+00	2025-08-23 08:50:19.209841+00	t
\.


--
-- TOC entry 4065 (class 0 OID 22575)
-- Dependencies: 323
-- Data for Name: park_time_slots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.park_time_slots (id, activity_id, slot_time, capacity, created_at) FROM stdin;
\.


--
-- TOC entry 4060 (class 0 OID 17859)
-- Dependencies: 317
-- Data for Name: pass_activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pass_activities (id, pass_id, event_activity_id, created_at) FROM stdin;
41701aab-8e9a-4635-beab-11a5b83344e6	650e8400-e29b-41d4-a716-446655440003	99264814-637e-4117-899d-b305b1343241	2025-08-25 19:34:34.545314+00
77f57b07-a802-43eb-bc15-f6e57c2e90ee	660e8400-e29b-41d4-a716-446655440001	99264814-637e-4117-899d-b305b1343241	2025-08-25 19:34:51.907556+00
32afedd2-f8ca-4641-aa9d-ce48448ef271	660e8400-e29b-41d4-a716-446655440001	a2974b53-d11a-45ec-87f7-6e7976c26a13	2025-08-25 19:34:51.907556+00
68e1156d-8096-437a-b06f-de08ea7b1ad2	164ba1e6-5188-410b-a8ce-976f1b6bf12d	a2974b53-d11a-45ec-87f7-6e7976c26a13	2025-09-05 01:26:19.908712+00
\.


--
-- TOC entry 4053 (class 0 OID 17515)
-- Dependencies: 310
-- Data for Name: passes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.passes (id, event_id, name, price, description, initial_stock, created_at, is_park, pass_type, guaranteed_runs) FROM stdin;
164ba1e6-5188-410b-a8ce-976f1b6bf12d	550e8400-e29b-41d4-a716-446655440000	Baby Poney	2.00	Billet Baby Poney (créneau requis).	15	2025-08-28 15:48:34.909171+00	f	baby_poney	\N
650e8400-e29b-41d4-a716-446655440003	550e8400-e29b-41d4-a716-446655440000	Pass Luge seule (2+ ans)	6.00	Pass donnant droit à la luge en illimité le jour de l'événement.	\N	2025-08-23 08:37:30.178176+00	f	\N	\N
660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440000	Pass Marmaille (2-8 ans)	7.00	Pass spécialement conçu pour les enfants de 2 à 8 ans. Inclut la luge en illimitée et un tour de poney. Pour la luge les enfants de moins de 1m40 doivent être accompagnés d'un adulte muni d'un Pass avec luge illimitée.	120	2025-08-23 08:50:19.209841+00	f	\N	\N
\.


--
-- TOC entry 4067 (class 0 OID 23851)
-- Dependencies: 327
-- Data for Name: reservation_validations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reservation_validations (id, reservation_id, activity, validated_by, validated_at, revoked_at, revoked_by, revoke_reason) FROM stdin;
4d17a328-a365-4d3d-9bda-6f1abdae137c	d4dccb73-2211-4917-8e77-640c6de0c032	luge_bracelet	00000000-0000-0000-0000-000000000001	2025-09-05 12:56:41.339521+00	\N	\N	\N
b4c35e23-d3b5-418a-be02-aa2bdf3c908b	c8852702-0a5a-468b-9cad-5005666b115f	luge_bracelet	00000000-0000-0000-0000-000000000001	2025-09-07 20:54:09.247122+00	\N	\N	\N
ef0e90f6-4624-4e5f-889a-2ab1dd531726	3a3196dd-5434-4699-baf2-b60f9d6cf5f5	luge_bracelet	de2cb7c8-f5ed-46ba-a656-844c62e25a80	2025-09-06 00:32:02.301682+00	2025-09-08 00:45:35.499+00	de2cb7c8-f5ed-46ba-a656-844c62e25a80	Pour faire des tests
e93fa6ed-6eb2-4321-adbe-567111025a0c	6778c980-8174-4132-82e6-aa3353483068	luge_bracelet	de2cb7c8-f5ed-46ba-a656-844c62e25a80	2025-09-06 20:57:25.713099+00	2025-09-08 01:32:11.69+00	de2cb7c8-f5ed-46ba-a656-844c62e25a80	test
8cf4e529-be75-42cf-9384-f7a8fb1ceafc	6778c980-8174-4132-82e6-aa3353483068	tir_arc	de2cb7c8-f5ed-46ba-a656-844c62e25a80	2025-09-06 21:32:00.159671+00	2025-09-08 01:33:01.355+00	de2cb7c8-f5ed-46ba-a656-844c62e25a80	doublon\n
\.


--
-- TOC entry 4055 (class 0 OID 17565)
-- Dependencies: 312
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reservations (id, reservation_number, client_email, pass_id, time_slot_id, payment_status, created_at, event_activity_id) FROM stdin;
2a8b3f70-38f0-4fa1-a427-3bec65fa3ed8	RES-2025-242-6454	test@example.com	\N	\N	paid	2025-08-30 22:33:56.842036+00	\N
bcb16f5f-02fe-4540-9a9e-39dbf7afa897	RES-2025-242-0140	j.delgard@hotmail.fr	\N	\N	paid	2025-08-30 23:16:58.512763+00	\N
d4dccb73-2211-4917-8e77-640c6de0c032	RES-2025-248-5853	demo-client@example.com	\N	\N	paid	2025-09-05 12:56:41.339521+00	\N
e61b0e25-4643-48ea-8e77-92e72b256d36	RES-2025-248-3806	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-05 23:57:03.136219+00	\N
3a3196dd-5434-4699-baf2-b60f9d6cf5f5	RES-2025-249-0429	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-06 00:05:02.254746+00	\N
ba5abc1b-3eac-4eb9-89e6-e219b77a3fa8	RES-2025-249-4835	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-06 00:12:53.531216+00	\N
b94b6329-de73-4203-ac8a-d1e018c99041	RES-2025-249-2690	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-06 00:21:20.7176+00	\N
1294be83-29d2-4854-80e0-cd9ff016f2a8	RES-2025-249-1477	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-06 00:39:37.847381+00	\N
4a91f9d1-0647-45a7-8166-77953bc40ae4	RES-2025-249-7705	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-06 00:43:40.038239+00	\N
6a6f88f9-2199-4a97-8564-5f54dfa64efe	RES-2025-249-6640	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-06 00:47:08.189889+00	\N
857f5b44-e6bf-4049-922a-2e88a3c41415	RES-2025-249-7033	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-06 01:00:54.944169+00	\N
f49a1f21-9209-4e34-9aef-1d71d07f50ef	RES-2025-249-4992	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-06 20:10:36.307547+00	\N
6778c980-8174-4132-82e6-aa3353483068	RES-2025-249-7908	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-06 20:40:33.226654+00	\N
c8852702-0a5a-468b-9cad-5005666b115f	RES-2025-250-1515	demo-client@example.com	\N	\N	paid	2025-09-07 20:54:09.247122+00	\N
a8c25a98-55c3-4a18-bb76-de83484664e9	RES-2025-251-3756	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-08 07:29:56.375063+00	\N
0e07f30e-ef92-4a12-a0ad-f1c92c26eb64	RES-2025-251-3953	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-08 07:57:38.094962+00	\N
6cfccaf9-696a-49ce-bb9e-b814f44214ad	RES-2025-251-5791	admin@parcdelaluge.re	650e8400-e29b-41d4-a716-446655440003	\N	paid	2025-09-08 13:07:16.324606+00	\N
\.


--
-- TOC entry 4064 (class 0 OID 22508)
-- Dependencies: 322
-- Data for Name: shop_products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shop_products (id, shop_id, pass_id, category, sort_order, is_active, created_at) FROM stdin;
\.


--
-- TOC entry 4063 (class 0 OID 22496)
-- Dependencies: 321
-- Data for Name: shops; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shops (id, domain, name, is_default, brand_primary_color, brand_logo_url, created_at) FROM stdin;
\.


--
-- TOC entry 4070 (class 0 OID 31827)
-- Dependencies: 335
-- Data for Name: stripe_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stripe_sessions (id, created_at) FROM stdin;
cs_test_a10UHK6BNOhYxectsnHDYx4WpO4vxQSmR2Zxx0HkChxv1z66hPbGzSMwDv	2025-09-05 23:56:13.830349+00
cs_test_a1GQIFjmIc3QJcQxafrJ000zjhBj7fYGS8p9NgPaZLqNdl5OscC4ai39iX	2025-09-05 23:57:02.901858+00
cs_test_a148Ur8IKcCcr9KEgX2MzNWhNsPOHngMpXn7Z5et010p2PDNQpBGUidmo2	2025-09-06 00:05:01.958283+00
cs_test_a1mqi286yOzPtV8b6lEfzpHy1t3qFF9sVdjIsU9iuneKXuJU8M8BtRNOGy	2025-09-06 00:12:52.939747+00
cs_test_a1utATlr8YnTDZ8RsllqY8ult34sOMMC9cMLm5yTLye5PqXQNfBpUuvIjQ	2025-09-06 00:21:19.896347+00
cs_test_a1KQuoFzYCVZX7EnmPc0cZxR5jBtTNMUKGStowD1ldZSRNf7BTNKFvJXvy	2025-09-06 00:39:37.203043+00
cs_test_a157rUBVtW09CnCTGuZfztAfqCI5GAcWmCKkcIPAmeMQyZYJEeuql5O34B	2025-09-06 00:43:39.381677+00
cs_test_a1Hl7d0CZy58DpcimBiw55OY5EQ5VDInMFJWX7tJCRDnWq8T3kLPEPGGON	2025-09-06 00:47:07.978195+00
cs_test_a1wiWFQXfFm0yaMeBAQIdkATDQDIke4DmMToI6xPJpkRMq5AY7JzNcmEfa	2025-09-06 00:51:18.520488+00
cs_test_a1e1kKi46GZ3efMjtWQ3HqbBfehTtepO6Y98o8URDHlYHqfHmoPQubbmbp	2025-09-06 01:00:54.65993+00
cs_test_a1OpmcjzNejca68epqayRIH1o11HQ2bxRQXLtKtc9Uw34ffswr2dwMr1VA	2025-09-06 20:10:35.71671+00
cs_test_a1O7mj9cShaPqusDMkOagvRz9HD7MbuE7pp7Zhr3tXenmlecfcQLxsQzjr	2025-09-06 20:40:32.691123+00
cs_test_a1P1GJABOUYbHNSrsOFpYiFS5uWVoAk9hdBx9QjnpJcS3ODTNqSsQwtH3q	2025-09-08 07:29:56.18167+00
cs_test_a1lvoF1PrsdoUAVaEVf9rN3GmicxMmLXmEp3YtFN0Pm94uuRNUrRLaUnfW	2025-09-08 07:57:37.518774+00
cs_test_a1MouGu6XbrauLBXmCYoepsPfTYlmlqad36fZiOXD8i96DRt3KfU8I9Nzi	2025-09-08 13:07:15.747463+00
\.


--
-- TOC entry 4054 (class 0 OID 17533)
-- Dependencies: 311
-- Data for Name: time_slots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.time_slots (id, slot_time, capacity, created_at, pass_id, event_activity_id) FROM stdin;
58db6740-636c-456f-b9c3-ea0820d6ed69	2025-03-15 07:30:00+00	6	2025-08-25 08:45:13.667818+00	\N	a2974b53-d11a-45ec-87f7-6e7976c26a13
4b64bbbf-f637-4a23-92ea-0e54a26e1e3f	2025-03-15 08:00:00+00	6	2025-08-25 08:45:13.667818+00	\N	a2974b53-d11a-45ec-87f7-6e7976c26a13
6efe1ffa-7c38-4fea-910a-c408e803be12	2025-03-15 09:30:00+00	12	2025-08-25 08:45:57.938954+00	\N	a2974b53-d11a-45ec-87f7-6e7976c26a13
6f1f66b0-c71e-4ea4-8832-652402179cd7	2025-03-15 10:00:00+00	12	2025-08-25 08:45:57.938954+00	\N	a2974b53-d11a-45ec-87f7-6e7976c26a13
d904affa-b055-4476-bc3d-d5dce8e840a4	2025-03-15 10:30:00+00	12	2025-08-25 08:45:57.938954+00	\N	a2974b53-d11a-45ec-87f7-6e7976c26a13
ba033043-3b35-42fa-949e-493fcb4ca513	2025-03-15 11:00:00+00	12	2025-08-25 08:45:57.938954+00	\N	a2974b53-d11a-45ec-87f7-6e7976c26a13
8b24d5f3-09b3-4775-b815-e36935d9f055	2025-03-15 12:30:00+00	12	2025-08-25 08:46:34.90902+00	\N	a2974b53-d11a-45ec-87f7-6e7976c26a13
34415bca-cf8e-4614-888f-c94a1348c92d	2025-03-15 14:00:00+00	12	2025-08-25 08:46:34.90902+00	\N	a2974b53-d11a-45ec-87f7-6e7976c26a13
24d78a87-3435-45f1-ac0f-fd5fb4751166	2025-03-15 14:30:00+00	12	2025-08-25 08:46:34.90902+00	\N	a2974b53-d11a-45ec-87f7-6e7976c26a13
12aa6c2f-87e1-44e6-b82a-d27ec869b7aa	2025-03-15 15:00:00+00	12	2025-08-25 08:46:34.90902+00	\N	a2974b53-d11a-45ec-87f7-6e7976c26a13
30c80507-181d-42f3-b395-6431c27f80cd	2025-03-15 15:30:00+00	12	2025-08-25 08:46:34.90902+00	\N	a2974b53-d11a-45ec-87f7-6e7976c26a13
c7d8fbe2-9619-4fcf-89d2-dda4530c8b33	2025-03-15 08:30:00+00	15	2025-08-25 09:06:18.763456+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
0f4dae04-027c-475a-a983-2b429c24a4ff	2025-03-15 08:50:00+00	15	2025-08-25 09:06:18.763456+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
ea0682cc-5fc6-4aab-a162-75704bdf7baa	2025-03-15 09:10:00+00	15	2025-08-25 09:06:18.763456+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
e6c20c5c-8aaf-49d5-a7f6-21a727e465f2	2025-03-15 09:30:00+00	15	2025-08-25 09:06:18.763456+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
d342f9a5-eb89-491b-9eae-acaee7a556c8	2025-03-15 09:50:00+00	15	2025-08-25 09:06:18.763456+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
73b549d2-2025-485b-91f4-2193934d88f4	2025-03-15 10:10:00+00	15	2025-08-25 09:06:18.763456+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
941cff34-5167-496d-9ffc-2e35c288c33a	2025-03-15 10:30:00+00	15	2025-08-25 09:06:18.763456+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
1924a431-e2ec-45cb-bcb2-12d7c86e52ad	2025-03-15 10:50:00+00	15	2025-08-25 09:06:18.763456+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
bb87c785-dd6c-4988-8220-3221890ef78d	2025-03-15 11:10:00+00	15	2025-08-25 09:06:18.763456+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
0e0194bb-f14f-4bae-908e-19a3dfb1b0c1	2025-03-15 12:30:00+00	15	2025-08-25 09:06:35.853584+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
ccb4e593-7faa-4c7a-8680-5ad0cfe6d4ed	2025-03-15 12:50:00+00	15	2025-08-25 09:06:35.853584+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
86f28aed-1bcc-4db6-84d0-007625ed46f3	2025-03-15 13:10:00+00	15	2025-08-25 09:06:35.853584+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
2b9f0a73-4790-44c8-81cf-a3c1bea99c6d	2025-03-15 13:30:00+00	15	2025-08-25 09:06:35.853584+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
37482ec4-6546-49a6-afd9-8d99f81a5f5b	2025-03-15 13:50:00+00	15	2025-08-25 09:06:35.853584+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
b77f63de-bf9b-43ad-bb44-59e2664c45ea	2025-03-15 14:10:00+00	15	2025-08-25 09:06:35.853584+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
c3a3c256-1af5-47e5-8fdc-a8de33ce4b92	2025-03-15 14:30:00+00	15	2025-08-25 09:06:35.853584+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
fb541664-9688-4f88-984a-bc3f34240d55	2025-03-15 14:50:00+00	15	2025-08-25 09:06:35.853584+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
b5f8d04a-7691-47be-bf6d-2e5395ac57ee	2025-03-15 15:10:00+00	15	2025-08-25 09:06:35.853584+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
e298e817-dc8a-48c0-b123-263f05544e58	2025-03-15 15:30:00+00	15	2025-08-25 09:06:35.853584+00	\N	46582e48-2a74-491b-af56-2f8ac3002d83
\.


--
-- TOC entry 4051 (class 0 OID 17481)
-- Dependencies: 308
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, role, created_at) FROM stdin;
990e8400-e29b-41d4-a716-446655440001	admin@billetevent.com	admin	2025-08-23 08:50:19.209841+00
de2cb7c8-f5ed-46ba-a656-844c62e25a80	admin@test.com	admin	2025-08-23 22:38:44.046032+00
00000000-0000-0000-0000-000000000001	luge_provider@example.com	luge_provider	2025-09-05 12:51:45.192311+00
\.


--
-- TOC entry 4068 (class 0 OID 26169)
-- Dependencies: 332
-- Data for Name: webhook_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.webhook_events (id, received_at) FROM stdin;
evt_1S1y1uA4GiAh5zP7JbDtEhnM	2025-08-30 23:17:56.857529+00
evt_3S1y1sA4GiAh5zP71mQhFvBb	2025-08-30 23:17:58.088732+00
\.


--
-- TOC entry 3754 (class 2606 OID 17818)
-- Name: activities activities_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_name_key UNIQUE (name);


--
-- TOC entry 3756 (class 2606 OID 17816)
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- TOC entry 3752 (class 2606 OID 17785)
-- Name: activity_resources activity_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_resources
    ADD CONSTRAINT activity_resources_pkey PRIMARY KEY (id);


--
-- TOC entry 3789 (class 2606 OID 22619)
-- Name: activity_variants activity_variants_activity_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_variants
    ADD CONSTRAINT activity_variants_activity_id_name_key UNIQUE (activity_id, name);


--
-- TOC entry 3791 (class 2606 OID 22617)
-- Name: activity_variants activity_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_variants
    ADD CONSTRAINT activity_variants_pkey PRIMARY KEY (id);


--
-- TOC entry 3805 (class 2606 OID 26254)
-- Name: cart_item_activities cart_item_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_item_activities
    ADD CONSTRAINT cart_item_activities_pkey PRIMARY KEY (id);


--
-- TOC entry 3747 (class 2606 OID 17601)
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3758 (class 2606 OID 17828)
-- Name: event_activities event_activities_event_id_activity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_activities
    ADD CONSTRAINT event_activities_event_id_activity_id_key UNIQUE (event_id, activity_id);


--
-- TOC entry 3760 (class 2606 OID 17826)
-- Name: event_activities event_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_activities
    ADD CONSTRAINT event_activities_pkey PRIMARY KEY (id);


--
-- TOC entry 3768 (class 2606 OID 20121)
-- Name: event_animations event_animations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_animations
    ADD CONSTRAINT event_animations_pkey PRIMARY KEY (id);


--
-- TOC entry 3773 (class 2606 OID 20215)
-- Name: event_faqs event_faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_faqs
    ADD CONSTRAINT event_faqs_pkey PRIMARY KEY (id);


--
-- TOC entry 3730 (class 2606 OID 17510)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- TOC entry 3787 (class 2606 OID 22582)
-- Name: park_time_slots park_time_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_time_slots
    ADD CONSTRAINT park_time_slots_pkey PRIMARY KEY (id);


--
-- TOC entry 3764 (class 2606 OID 17867)
-- Name: pass_activities pass_activities_pass_id_event_activity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pass_activities
    ADD CONSTRAINT pass_activities_pass_id_event_activity_id_key UNIQUE (pass_id, event_activity_id);


--
-- TOC entry 3766 (class 2606 OID 17865)
-- Name: pass_activities pass_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pass_activities
    ADD CONSTRAINT pass_activities_pkey PRIMARY KEY (id);


--
-- TOC entry 3736 (class 2606 OID 17524)
-- Name: passes passes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passes
    ADD CONSTRAINT passes_pkey PRIMARY KEY (id);


--
-- TOC entry 3799 (class 2606 OID 23860)
-- Name: reservation_validations reservation_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_validations
    ADD CONSTRAINT reservation_validations_pkey PRIMARY KEY (id);


--
-- TOC entry 3743 (class 2606 OID 17575)
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- TOC entry 3745 (class 2606 OID 17577)
-- Name: reservations reservations_reservation_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_reservation_number_key UNIQUE (reservation_number);


--
-- TOC entry 3782 (class 2606 OID 22519)
-- Name: shop_products shop_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_products
    ADD CONSTRAINT shop_products_pkey PRIMARY KEY (id);


--
-- TOC entry 3784 (class 2606 OID 22521)
-- Name: shop_products shop_products_shop_id_pass_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_products
    ADD CONSTRAINT shop_products_shop_id_pass_id_key UNIQUE (shop_id, pass_id);


--
-- TOC entry 3777 (class 2606 OID 22507)
-- Name: shops shops_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_domain_key UNIQUE (domain);


--
-- TOC entry 3779 (class 2606 OID 22505)
-- Name: shops shops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_pkey PRIMARY KEY (id);


--
-- TOC entry 3807 (class 2606 OID 31834)
-- Name: stripe_sessions stripe_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_sessions
    ADD CONSTRAINT stripe_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 3740 (class 2606 OID 17543)
-- Name: time_slots time_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT time_slots_pkey PRIMARY KEY (id);


--
-- TOC entry 3726 (class 2606 OID 17493)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3728 (class 2606 OID 17491)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3803 (class 2606 OID 26176)
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);


--
-- TOC entry 3792 (class 1259 OID 22628)
-- Name: idx_activity_variants_active_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_variants_active_order ON public.activity_variants USING btree (is_active, sort_order);


--
-- TOC entry 3793 (class 1259 OID 22627)
-- Name: idx_activity_variants_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_variants_activity ON public.activity_variants USING btree (activity_id);


--
-- TOC entry 3748 (class 1259 OID 22601)
-- Name: idx_cart_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_product ON public.cart_items USING btree (product_type, product_id);


--
-- TOC entry 3749 (class 1259 OID 17614)
-- Name: idx_cart_items_reserved_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_reserved_until ON public.cart_items USING btree (reserved_until);


--
-- TOC entry 3750 (class 1259 OID 17613)
-- Name: idx_cart_items_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_session ON public.cart_items USING btree (session_id);


--
-- TOC entry 3769 (class 1259 OID 20132)
-- Name: idx_event_animations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_animations_active ON public.event_animations USING btree (is_active) WHERE (is_active = true);


--
-- TOC entry 3770 (class 1259 OID 20130)
-- Name: idx_event_animations_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_animations_event_id ON public.event_animations USING btree (event_id);


--
-- TOC entry 3771 (class 1259 OID 20131)
-- Name: idx_event_animations_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_animations_time ON public.event_animations USING btree (start_time, end_time);


--
-- TOC entry 3774 (class 1259 OID 20224)
-- Name: idx_event_faqs_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_faqs_event_id ON public.event_faqs USING btree (event_id);


--
-- TOC entry 3775 (class 1259 OID 20225)
-- Name: idx_event_faqs_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_faqs_position ON public.event_faqs USING btree (event_id, "position");


--
-- TOC entry 3731 (class 1259 OID 17514)
-- Name: idx_events_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_dates ON public.events USING btree (event_date, sales_opening_date, sales_closing_date);


--
-- TOC entry 3732 (class 1259 OID 17513)
-- Name: idx_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_status ON public.events USING btree (status);


--
-- TOC entry 3785 (class 1259 OID 22591)
-- Name: idx_park_time_slots_activity_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_park_time_slots_activity_time ON public.park_time_slots USING btree (activity_id, slot_time);


--
-- TOC entry 3761 (class 1259 OID 17887)
-- Name: idx_pass_activities_event_activity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pass_activities_event_activity_id ON public.pass_activities USING btree (event_activity_id);


--
-- TOC entry 3762 (class 1259 OID 17886)
-- Name: idx_pass_activities_pass_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pass_activities_pass_id ON public.pass_activities USING btree (pass_id);


--
-- TOC entry 3733 (class 1259 OID 17532)
-- Name: idx_passes_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_passes_event ON public.passes USING btree (event_id);


--
-- TOC entry 3734 (class 1259 OID 22540)
-- Name: idx_passes_is_park; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_passes_is_park ON public.passes USING btree (is_park);


--
-- TOC entry 3794 (class 1259 OID 35272)
-- Name: idx_reservation_validations_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservation_validations_activity ON public.reservation_validations USING btree (activity);


--
-- TOC entry 3795 (class 1259 OID 35343)
-- Name: idx_reservation_validations_activity_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservation_validations_activity_date ON public.reservation_validations USING btree (activity, validated_at DESC);


--
-- TOC entry 3796 (class 1259 OID 35271)
-- Name: idx_reservation_validations_validated_at_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservation_validations_validated_at_desc ON public.reservation_validations USING btree (validated_at DESC);


--
-- TOC entry 3797 (class 1259 OID 35273)
-- Name: idx_reservation_validations_validated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservation_validations_validated_by ON public.reservation_validations USING btree (validated_by);


--
-- TOC entry 3741 (class 1259 OID 17590)
-- Name: idx_reservations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservations_email ON public.reservations USING btree (client_email);


--
-- TOC entry 3780 (class 1259 OID 22532)
-- Name: idx_shop_products_shop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_products_shop_id ON public.shop_products USING btree (shop_id);


--
-- TOC entry 3737 (class 1259 OID 17888)
-- Name: idx_time_slots_event_activity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_slots_event_activity_id ON public.time_slots USING btree (event_activity_id);


--
-- TOC entry 3738 (class 1259 OID 17774)
-- Name: idx_time_slots_slot_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_slots_slot_time ON public.time_slots USING btree (slot_time);


--
-- TOC entry 3800 (class 1259 OID 35356)
-- Name: reservation_validations_unique_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reservation_validations_unique_active ON public.reservation_validations USING btree (reservation_id, activity) WHERE (revoked_at IS NULL);


--
-- TOC entry 3801 (class 1259 OID 26177)
-- Name: ux_webhook_events_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_webhook_events_id ON public.webhook_events USING btree (id);


--
-- TOC entry 3836 (class 2620 OID 17619)
-- Name: reservations trigger_set_reservation_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_reservation_number BEFORE INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.set_reservation_number();


--
-- TOC entry 3837 (class 2620 OID 19003)
-- Name: event_activities trigger_sync_on_requires_timeslot_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_on_requires_timeslot_change BEFORE UPDATE ON public.event_activities FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_on_requires_timeslot_change();


--
-- TOC entry 3835 (class 2620 OID 19001)
-- Name: time_slots trigger_sync_stock_on_timeslot_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_stock_on_timeslot_change AFTER INSERT OR DELETE OR UPDATE ON public.time_slots FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_activity_stock();


--
-- TOC entry 3817 (class 2606 OID 17839)
-- Name: activity_resources activity_resources_event_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_resources
    ADD CONSTRAINT activity_resources_event_activity_id_fkey FOREIGN KEY (event_activity_id) REFERENCES public.event_activities(id) ON DELETE CASCADE;


--
-- TOC entry 3818 (class 2606 OID 17788)
-- Name: activity_resources activity_resources_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_resources
    ADD CONSTRAINT activity_resources_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- TOC entry 3828 (class 2606 OID 22620)
-- Name: activity_variants activity_variants_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_variants
    ADD CONSTRAINT activity_variants_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- TOC entry 3832 (class 2606 OID 26255)
-- Name: cart_item_activities cart_item_activities_cart_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_item_activities
    ADD CONSTRAINT cart_item_activities_cart_item_id_fkey FOREIGN KEY (cart_item_id) REFERENCES public.cart_items(id) ON DELETE CASCADE;


--
-- TOC entry 3833 (class 2606 OID 26260)
-- Name: cart_item_activities cart_item_activities_event_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_item_activities
    ADD CONSTRAINT cart_item_activities_event_activity_id_fkey FOREIGN KEY (event_activity_id) REFERENCES public.event_activities(id) ON DELETE CASCADE;


--
-- TOC entry 3834 (class 2606 OID 26265)
-- Name: cart_item_activities cart_item_activities_time_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_item_activities
    ADD CONSTRAINT cart_item_activities_time_slot_id_fkey FOREIGN KEY (time_slot_id) REFERENCES public.time_slots(id) ON DELETE CASCADE;


--
-- TOC entry 3814 (class 2606 OID 17844)
-- Name: cart_items cart_items_event_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_event_activity_id_fkey FOREIGN KEY (event_activity_id) REFERENCES public.event_activities(id) ON DELETE CASCADE;


--
-- TOC entry 3815 (class 2606 OID 17602)
-- Name: cart_items cart_items_pass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pass_id_fkey FOREIGN KEY (pass_id) REFERENCES public.passes(id);


--
-- TOC entry 3816 (class 2606 OID 17607)
-- Name: cart_items cart_items_time_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_time_slot_id_fkey FOREIGN KEY (time_slot_id) REFERENCES public.time_slots(id);


--
-- TOC entry 3819 (class 2606 OID 17834)
-- Name: event_activities event_activities_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_activities
    ADD CONSTRAINT event_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- TOC entry 3820 (class 2606 OID 17829)
-- Name: event_activities event_activities_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_activities
    ADD CONSTRAINT event_activities_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- TOC entry 3823 (class 2606 OID 20122)
-- Name: event_animations event_animations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_animations
    ADD CONSTRAINT event_animations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- TOC entry 3824 (class 2606 OID 20216)
-- Name: event_faqs event_faqs_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_faqs
    ADD CONSTRAINT event_faqs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- TOC entry 3827 (class 2606 OID 22583)
-- Name: park_time_slots park_time_slots_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_time_slots
    ADD CONSTRAINT park_time_slots_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- TOC entry 3821 (class 2606 OID 17873)
-- Name: pass_activities pass_activities_event_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pass_activities
    ADD CONSTRAINT pass_activities_event_activity_id_fkey FOREIGN KEY (event_activity_id) REFERENCES public.event_activities(id) ON DELETE CASCADE;


--
-- TOC entry 3822 (class 2606 OID 17868)
-- Name: pass_activities pass_activities_pass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pass_activities
    ADD CONSTRAINT pass_activities_pass_id_fkey FOREIGN KEY (pass_id) REFERENCES public.passes(id) ON DELETE CASCADE;


--
-- TOC entry 3808 (class 2606 OID 17525)
-- Name: passes passes_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passes
    ADD CONSTRAINT passes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- TOC entry 3829 (class 2606 OID 23861)
-- Name: reservation_validations reservation_validations_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_validations
    ADD CONSTRAINT reservation_validations_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;


--
-- TOC entry 3830 (class 2606 OID 35344)
-- Name: reservation_validations reservation_validations_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_validations
    ADD CONSTRAINT reservation_validations_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id);


--
-- TOC entry 3831 (class 2606 OID 23866)
-- Name: reservation_validations reservation_validations_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation_validations
    ADD CONSTRAINT reservation_validations_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id);


--
-- TOC entry 3811 (class 2606 OID 17849)
-- Name: reservations reservations_event_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_event_activity_id_fkey FOREIGN KEY (event_activity_id) REFERENCES public.event_activities(id) ON DELETE CASCADE;


--
-- TOC entry 3812 (class 2606 OID 17578)
-- Name: reservations reservations_pass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pass_id_fkey FOREIGN KEY (pass_id) REFERENCES public.passes(id);


--
-- TOC entry 3813 (class 2606 OID 17583)
-- Name: reservations reservations_time_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_time_slot_id_fkey FOREIGN KEY (time_slot_id) REFERENCES public.time_slots(id);


--
-- TOC entry 3825 (class 2606 OID 22527)
-- Name: shop_products shop_products_pass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_products
    ADD CONSTRAINT shop_products_pass_id_fkey FOREIGN KEY (pass_id) REFERENCES public.passes(id) ON DELETE CASCADE;


--
-- TOC entry 3826 (class 2606 OID 22522)
-- Name: shop_products shop_products_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_products
    ADD CONSTRAINT shop_products_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- TOC entry 3809 (class 2606 OID 17881)
-- Name: time_slots time_slots_event_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT time_slots_event_activity_id_fkey FOREIGN KEY (event_activity_id) REFERENCES public.event_activities(id) ON DELETE CASCADE;


--
-- TOC entry 3810 (class 2606 OID 17765)
-- Name: time_slots time_slots_pass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT time_slots_pass_id_fkey FOREIGN KEY (pass_id) REFERENCES public.passes(id) ON DELETE CASCADE;


--
-- TOC entry 4041 (class 3256 OID 22706)
-- Name: activities Admins can manage activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage activities" ON public.activities TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4015 (class 3256 OID 17793)
-- Name: activity_resources Admins can manage activity resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage activity resources" ON public.activity_resources TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4042 (class 3256 OID 22708)
-- Name: reservations Admins can manage all reservations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all reservations" ON public.reservations TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4028 (class 3256 OID 20221)
-- Name: event_faqs Admins can manage event FAQs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage event FAQs" ON public.event_faqs TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4030 (class 3256 OID 22704)
-- Name: event_activities Admins can manage event activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage event activities" ON public.event_activities TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4012 (class 3256 OID 20136)
-- Name: event_animations Admins can manage event animations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage event animations" ON public.event_animations TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4009 (class 3256 OID 22698)
-- Name: events Admins can manage events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage events" ON public.events TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4026 (class 3256 OID 17878)
-- Name: pass_activities Admins can manage pass activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage pass activities" ON public.pass_activities TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4020 (class 3256 OID 22700)
-- Name: passes Admins can manage passes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage passes" ON public.passes TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4044 (class 3256 OID 22712)
-- Name: shop_products Admins can manage shop products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shop products" ON public.shop_products TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4043 (class 3256 OID 22710)
-- Name: shops Admins can manage shops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shops" ON public.shops TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4021 (class 3256 OID 22702)
-- Name: time_slots Admins can manage time slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage time slots" ON public.time_slots TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4039 (class 3256 OID 35354)
-- Name: users Admins can read all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all users" ON public.users FOR SELECT TO authenticated USING (public.is_admin());


--
-- TOC entry 4048 (class 3256 OID 35274)
-- Name: reservation_validations Admins can revoke validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can revoke validations" ON public.reservation_validations FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text)))));


--
-- TOC entry 4040 (class 3256 OID 35355)
-- Name: users Admins can update users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update users" ON public.users FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- TOC entry 4019 (class 3256 OID 22597)
-- Name: park_time_slots Admins manage park_time_slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage park_time_slots" ON public.park_time_slots TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4025 (class 3256 OID 22626)
-- Name: activity_variants Admins manage variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage variants" ON public.activity_variants TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4033 (class 3256 OID 17734)
-- Name: passes Allow all operations on passes for development; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations on passes for development" ON public.passes USING (true) WITH CHECK (true);


--
-- TOC entry 4013 (class 3256 OID 35338)
-- Name: stripe_sessions Allow service role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow service role" ON public.stripe_sessions TO service_role USING (true) WITH CHECK (true);


--
-- TOC entry 4010 (class 3256 OID 35333)
-- Name: webhook_events Allow service role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow service role" ON public.webhook_events TO service_role USING (true) WITH CHECK (true);


--
-- TOC entry 4037 (class 3256 OID 35352)
-- Name: users Allow user creation during signup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow user creation during signup" ON public.users FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- TOC entry 4046 (class 3256 OID 26270)
-- Name: cart_item_activities Anyone can manage their cart item activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage their cart item activities" ON public.cart_item_activities USING (true);


--
-- TOC entry 4014 (class 3256 OID 17612)
-- Name: cart_items Anyone can manage their cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage their cart items" ON public.cart_items USING (true);


--
-- TOC entry 4029 (class 3256 OID 20223)
-- Name: event_faqs Anyone can view FAQs for published events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view FAQs for published events" ON public.event_faqs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = event_faqs.event_id) AND (events.status = 'published'::text)))));


--
-- TOC entry 4007 (class 3256 OID 20135)
-- Name: event_animations Anyone can view active animations for published events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active animations for published events" ON public.event_animations FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = event_animations.event_id) AND (events.status = 'published'::text))))));


--
-- TOC entry 4022 (class 3256 OID 17854)
-- Name: activities Anyone can view activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view activities" ON public.activities FOR SELECT USING (true);


--
-- TOC entry 4016 (class 3256 OID 17795)
-- Name: activity_resources Anyone can view activity resources for published events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view activity resources for published events" ON public.activity_resources FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = activity_resources.event_id) AND (events.status = 'published'::text)))));


--
-- TOC entry 4023 (class 3256 OID 17856)
-- Name: event_activities Anyone can view event activities for published events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view event activities for published events" ON public.event_activities FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = event_activities.event_id) AND (events.status = 'published'::text)))));


--
-- TOC entry 4027 (class 3256 OID 17879)
-- Name: pass_activities Anyone can view pass activities for published events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view pass activities for published events" ON public.pass_activities FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.passes p
     JOIN public.events e ON ((e.id = p.event_id)))
  WHERE ((p.id = pass_activities.pass_id) AND (e.status = 'published'::text)))));


--
-- TOC entry 4034 (class 3256 OID 17735)
-- Name: passes Anyone can view passes for published events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view passes for published events" ON public.passes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = passes.event_id) AND (events.status = 'published'::text)))));


--
-- TOC entry 4032 (class 3256 OID 17511)
-- Name: events Anyone can view published events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published events" ON public.events FOR SELECT USING ((status = 'published'::text));


--
-- TOC entry 4011 (class 3256 OID 17772)
-- Name: time_slots Anyone can view time slots for published events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view time slots for published events" ON public.time_slots FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.passes p
     JOIN public.events e ON ((e.id = p.event_id)))
  WHERE ((p.id = time_slots.pass_id) AND (e.status = 'published'::text)))));


--
-- TOC entry 4045 (class 3256 OID 23871)
-- Name: reservation_validations Providers can insert validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Providers can insert validations" ON public.reservation_validations FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'pony_provider'::text, 'archery_provider'::text, 'luge_provider'::text, 'atlm_collaborator'::text]))))));


--
-- TOC entry 4047 (class 3256 OID 23872)
-- Name: reservation_validations Providers can read validations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Providers can read validations" ON public.reservation_validations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'pony_provider'::text, 'archery_provider'::text, 'luge_provider'::text, 'atlm_collaborator'::text]))))));


--
-- TOC entry 4008 (class 3256 OID 22535)
-- Name: shop_products Public can read shop products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read shop products" ON public.shop_products FOR SELECT USING (true);


--
-- TOC entry 4031 (class 3256 OID 22533)
-- Name: shops Public can read shops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read shops" ON public.shops FOR SELECT USING (true);


--
-- TOC entry 4018 (class 3256 OID 22596)
-- Name: park_time_slots Public read park_time_slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read park_time_slots" ON public.park_time_slots FOR SELECT USING (true);


--
-- TOC entry 4024 (class 3256 OID 22625)
-- Name: activity_variants Public read variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read variants" ON public.activity_variants FOR SELECT USING (true);


--
-- TOC entry 4017 (class 3256 OID 20161)
-- Name: events Service role can manage all events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage all events" ON public.events TO service_role USING (true) WITH CHECK (true);


--
-- TOC entry 4038 (class 3256 OID 35353)
-- Name: users Service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access" ON public.users TO service_role USING (true) WITH CHECK (true);


--
-- TOC entry 4049 (class 3256 OID 35276)
-- Name: reservations Staff can read reservations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can read reservations" ON public.reservations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'pony_provider'::text, 'archery_provider'::text, 'luge_provider'::text, 'atlm_collaborator'::text]))))));


--
-- TOC entry 4035 (class 3256 OID 35350)
-- Name: users Users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own profile" ON public.users FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- TOC entry 4036 (class 3256 OID 35351)
-- Name: users Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- TOC entry 3994 (class 0 OID 17806)
-- Dependencies: 315
-- Name: activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3993 (class 0 OID 17775)
-- Dependencies: 314
-- Name: activity_resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_resources ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4002 (class 0 OID 22606)
-- Dependencies: 324
-- Name: activity_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_variants ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4005 (class 0 OID 26249)
-- Dependencies: 333
-- Name: cart_item_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_item_activities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3992 (class 0 OID 17591)
-- Dependencies: 313
-- Name: cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3995 (class 0 OID 17819)
-- Dependencies: 316
-- Name: event_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_activities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3997 (class 0 OID 20111)
-- Dependencies: 318
-- Name: event_animations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_animations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3998 (class 0 OID 20208)
-- Dependencies: 319
-- Name: event_faqs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_faqs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3988 (class 0 OID 17496)
-- Dependencies: 309
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4001 (class 0 OID 22575)
-- Dependencies: 323
-- Name: park_time_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.park_time_slots ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3996 (class 0 OID 17859)
-- Dependencies: 317
-- Name: pass_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pass_activities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3989 (class 0 OID 17515)
-- Dependencies: 310
-- Name: passes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4003 (class 0 OID 23851)
-- Dependencies: 327
-- Name: reservation_validations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reservation_validations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3991 (class 0 OID 17565)
-- Dependencies: 312
-- Name: reservations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4000 (class 0 OID 22508)
-- Dependencies: 322
-- Name: shop_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3999 (class 0 OID 22496)
-- Dependencies: 321
-- Name: shops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4006 (class 0 OID 31827)
-- Dependencies: 335
-- Name: stripe_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_sessions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3990 (class 0 OID 17533)
-- Dependencies: 311
-- Name: time_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3987 (class 0 OID 17481)
-- Dependencies: 308
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4004 (class 0 OID 26169)
-- Dependencies: 332
-- Name: webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Completed on 2025-09-08 16:41:06

--
-- PostgreSQL database dump complete
--

\unrestrict 4Vk2t8Inb5okK2fZPiYsVQt8XOiRUdI2TMfwYXHc3LkZTX1AB3gftkddgdajVY1

