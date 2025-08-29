-- Fix product_type constraint on cart_items to allow only values used by the app
-- and ensure legacy pass_id can be NULL for non-event products.

DO $$
DECLARE
  con text;
BEGIN
  -- Drop any existing CHECK constraints involving product_type on cart_items
  FOR con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.cart_items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%product_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.cart_items DROP CONSTRAINT %I', con);
  END LOOP;

  -- Recreate the desired CHECK constraint (add as NOT VALID to avoid blocking if legacy rows exist)
  BEGIN
    ALTER TABLE public.cart_items
      ADD CONSTRAINT cart_items_product_type_check
      CHECK (product_type IN ('event_pass','activity_variant')) NOT VALID;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- already in desired state
  END;

  -- Ensure the necessary columns exist
  ALTER TABLE public.cart_items
    ADD COLUMN IF NOT EXISTS product_type text,
    ADD COLUMN IF NOT EXISTS product_id uuid,
    ADD COLUMN IF NOT EXISTS attendee_first_name text,
    ADD COLUMN IF NOT EXISTS attendee_last_name text,
    ADD COLUMN IF NOT EXISTS attendee_birth_year integer,
    ADD COLUMN IF NOT EXISTS access_conditions_ack boolean DEFAULT false;

  -- Allow NULL pass_id for non-event products
  BEGIN
    ALTER TABLE public.cart_items ALTER COLUMN pass_id DROP NOT NULL;
  EXCEPTION WHEN others THEN
    -- Column may already be nullable
    NULL;
  END;
END $$;

-- Try to validate the constraint if no legacy rows remain (ignore failures)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.cart_items VALIDATE CONSTRAINT cart_items_product_type_check;
  EXCEPTION WHEN others THEN
    NULL; -- keep NOT VALID until old rows are cleaned
  END;
END $$;

-- Optional: quick self-check (no-op if permissions restrict SELECT)
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint WHERE conrelid = 'public.cart_items'::regclass AND contype='c';
