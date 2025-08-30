-- Function to reserve a pass with stock check and locking
CREATE OR REPLACE FUNCTION reserve_pass_with_stock_check(
  session_id text,
  pass_id uuid,
  time_slot_id uuid DEFAULT NULL,
  quantity integer DEFAULT 1,
  attendee_first_name text DEFAULT NULL,
  attendee_last_name text DEFAULT NULL,
  attendee_birth_year integer DEFAULT NULL,
  access_conditions_ack boolean DEFAULT false,
  product_type text DEFAULT 'event_pass',
  product_id uuid DEFAULT NULL
)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
