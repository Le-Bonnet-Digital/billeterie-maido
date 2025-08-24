/*
  # Create missing Supabase functions

  1. Functions
    - `get_event_activity_remaining_stock` - Calculate remaining stock for event activities
    - `get_pass_max_stock_from_activities` - Get maximum stock for a pass based on activities
    - `get_pass_effective_remaining_stock` - Get effective remaining stock for a pass
    - `can_reserve_pass` - Check if a pass can be reserved

  2. Security
    - Functions are accessible to public for read operations
*/

-- Function to get remaining stock for an event activity
CREATE OR REPLACE FUNCTION public.get_event_activity_remaining_stock(event_activity_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    initial_stock_limit integer;
    reserved_quantity integer;
    sold_quantity integer;
BEGIN
    -- Get the initial stock limit for the event activity
    SELECT stock_limit INTO initial_stock_limit
    FROM public.event_activities
    WHERE id = event_activity_uuid;

    -- If stock_limit is NULL, it means unlimited stock
    IF initial_stock_limit IS NULL THEN
        RETURN 999999; -- Representing a very large number for unlimited
    END IF;

    -- Calculate reserved quantity from cart_items
    SELECT COALESCE(SUM(quantity), 0) INTO reserved_quantity
    FROM public.cart_items
    WHERE event_activity_id = event_activity_uuid
      AND reserved_until > NOW();

    -- Calculate sold quantity from reservations
    SELECT COALESCE(COUNT(r.id), 0) INTO sold_quantity
    FROM public.reservations r
    WHERE r.event_activity_id = event_activity_uuid
      AND r.payment_status = 'paid';

    RETURN initial_stock_limit - reserved_quantity - sold_quantity;
END;
$function$;

-- Function to get maximum stock for a pass based on its activities
CREATE OR REPLACE FUNCTION public.get_pass_max_stock_from_activities(pass_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    min_stock integer := 999999;
    activity_stock integer;
BEGIN
    -- Get the minimum stock from all activities linked to this pass
    FOR activity_stock IN
        SELECT public.get_event_activity_remaining_stock(pa.event_activity_id)
        FROM public.pass_activities pa
        WHERE pa.pass_id = pass_uuid
    LOOP
        IF activity_stock < min_stock THEN
            min_stock := activity_stock;
        END IF;
    END LOOP;

    RETURN min_stock;
END;
$function$;

-- Function to get effective remaining stock for a pass
CREATE OR REPLACE FUNCTION public.get_pass_effective_remaining_stock(pass_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    pass_stock integer;
    activity_stock integer;
    reserved_quantity integer;
    sold_quantity integer;
BEGIN
    -- Get the pass initial stock
    SELECT initial_stock INTO pass_stock
    FROM public.passes
    WHERE id = pass_uuid;

    -- If pass stock is NULL, it means unlimited
    IF pass_stock IS NULL THEN
        pass_stock := 999999;
    END IF;

    -- Get stock limitation from activities
    SELECT public.get_pass_max_stock_from_activities(pass_uuid) INTO activity_stock;

    -- Take the minimum between pass stock and activity stock
    IF activity_stock < pass_stock THEN
        pass_stock := activity_stock;
    END IF;

    -- Calculate reserved quantity from cart_items
    SELECT COALESCE(SUM(quantity), 0) INTO reserved_quantity
    FROM public.cart_items
    WHERE pass_id = pass_uuid
      AND reserved_until > NOW();

    -- Calculate sold quantity from reservations
    SELECT COALESCE(COUNT(r.id), 0) INTO sold_quantity
    FROM public.reservations r
    WHERE r.pass_id = pass_uuid
      AND r.payment_status = 'paid';

    RETURN pass_stock - reserved_quantity - sold_quantity;
END;
$function$;

-- Function to check if a pass can be reserved
CREATE OR REPLACE FUNCTION public.can_reserve_pass(pass_uuid uuid, quantity_requested integer)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    remaining_stock integer;
BEGIN
    SELECT public.get_pass_effective_remaining_stock(pass_uuid) INTO remaining_stock;
    RETURN remaining_stock >= quantity_requested;
END;
$function$;