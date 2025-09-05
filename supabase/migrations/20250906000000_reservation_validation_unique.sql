-- Add unique constraint to prevent double validation per reservation/activity
ALTER TABLE public.reservation_validations
  ADD CONSTRAINT reservation_validations_reservation_activity_key UNIQUE (reservation_id, activity);
