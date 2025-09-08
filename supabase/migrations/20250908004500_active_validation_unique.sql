/*
  # Allow multiple validations after revocation

  1. Drop existing unique constraint on (reservation_id, activity)
  2. Add partial unique index enforcing uniqueness only for active validations
*/

-- Drop old unique constraint
ALTER TABLE public.reservation_validations
  DROP CONSTRAINT IF EXISTS reservation_validations_reservation_activity_key;

-- Enforce uniqueness only for active validations
CREATE UNIQUE INDEX IF NOT EXISTS reservation_validations_unique_active
  ON public.reservation_validations (reservation_id, activity)
  WHERE revoked_at IS NULL;
