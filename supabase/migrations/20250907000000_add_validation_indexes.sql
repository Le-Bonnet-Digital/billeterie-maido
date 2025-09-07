-- Add indexes to reservation_validations for faster history queries
CREATE INDEX IF NOT EXISTS idx_reservation_validations_validated_at_desc
  ON public.reservation_validations (validated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reservation_validations_activity
  ON public.reservation_validations (activity);

CREATE INDEX IF NOT EXISTS idx_reservation_validations_validated_by
  ON public.reservation_validations (validated_by);
