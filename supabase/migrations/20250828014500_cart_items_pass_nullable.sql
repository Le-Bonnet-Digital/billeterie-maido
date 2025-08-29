-- Allow cart items without legacy pass_id for non-event products
DO $$
BEGIN
  BEGIN
    ALTER TABLE cart_items ALTER COLUMN pass_id DROP NOT NULL;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END $$;

