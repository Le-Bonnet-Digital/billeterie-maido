-- Update reserve_pass_with_stock_check to handle multiple activities
CREATE OR REPLACE FUNCTION reserve_pass_with_stock_check(
  session_id text,
  pass_id uuid,
  activities jsonb DEFAULT '[]'::jsonb,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
