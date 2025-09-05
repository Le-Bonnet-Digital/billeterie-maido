-- Purpose: enforce uniqueness of (reservation_id, activity) in reservation_validations
-- Strategy:
--   1) Lock table to avoid concurrent inserts creating new duplicates during cleanup
--   2) Delete duplicates, keeping the earliest validated_at (then by id)
--   3) Add UNIQUE constraint (if not already present)
-- Idempotent: safe to re-run (DELETE only removes rows with rn > 1; constraint is added only if absent)

DO $$
BEGIN
  -- 1) Lock table to prevent concurrent writes that could reintroduce duplicates during this migration
  --    SHARE ROW EXCLUSIVE allows DELETE and prevents concurrent ALTER TABLE on this relation
  EXECUTE 'LOCK TABLE public.reservation_validations IN SHARE ROW EXCLUSIVE MODE';

  -- 2) Remove duplicates (keep the earliest validated_at, then by id)
  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY reservation_id, activity
        ORDER BY validated_at ASC, id ASC
      ) AS rn
    FROM public.reservation_validations
  )
  DELETE FROM public.reservation_validations rv
  USING ranked
  WHERE rv.id = ranked.id
    AND ranked.rn > 1;

  -- 3) Add UNIQUE constraint if it does not already exist
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_class t  ON t.oid = c.conrelid
    JOIN   pg_namespace n ON n.oid = t.relnamespace
    WHERE  c.conname = 'reservation_validations_reservation_activity_key'
      AND  n.nspname = 'public'
      AND  t.relname = 'reservation_validations'
  ) THEN
    ALTER TABLE public.reservation_validations
      ADD CONSTRAINT reservation_validations_reservation_activity_key
      UNIQUE (reservation_id, activity);
  END IF;
END
$$;
