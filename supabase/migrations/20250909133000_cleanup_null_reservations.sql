-- Cleanup inconsistent records and enforce cascade deletes

-- Ensure reservation_validations are removed when their reservation is deleted
ALTER TABLE public.reservation_validations
DROP CONSTRAINT IF EXISTS reservation_validations_reservation_id_fkey;

ALTER TABLE public.reservation_validations
ADD CONSTRAINT reservation_validations_reservation_id_fkey
FOREIGN KEY (reservation_id)
REFERENCES public.reservations(id) ON DELETE CASCADE;

-- Remove rows missing required references
DELETE FROM cart_item_activities
WHERE event_activity_id IS NULL OR time_slot_id IS NULL;

DELETE FROM cart_items
WHERE event_activity_id IS NULL OR time_slot_id IS NULL;

DELETE FROM reservations
WHERE event_activity_id IS NULL OR time_slot_id IS NULL;
