-- Ensure product_type only allows supported values
DO $$
DECLARE
  con text;
BEGIN
  -- Drop any existing CHECK constraints on product_type
  FOR con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.cart_items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%CHECK (product_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.cart_items DROP CONSTRAINT %I', con);
  END LOOP;

  -- Recreate the desired CHECK constraint (ignore if it already exists)
  BEGIN
    ALTER TABLE public.cart_items
      ADD CONSTRAINT cart_items_product_type_check
      CHECK (product_type IN ('event_pass','activity_variant'));
  EXCEPTION WHEN duplicate_object THEN
    -- constraint already exists
    NULL;
  END;
END $$;
