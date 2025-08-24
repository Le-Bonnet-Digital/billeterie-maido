/*
  # Fix get_event_activity_remaining_stock function

  1. Function Fix
    - Correct column reference in reservations query
    - Fix table alias and column naming
    - Ensure proper aggregation of reserved quantities

  2. Changes
    - Replace r.quantity with COUNT(*) for reservations count
    - Fix cart_items quantity reference
    - Ensure function returns correct remaining stock
*/

-- Drop and recreate the function with correct column references
DROP FUNCTION IF EXISTS get_event_activity_remaining_stock(uuid);

CREATE OR REPLACE FUNCTION get_event_activity_remaining_stock(event_activity_id_param uuid)
RETURNS integer
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