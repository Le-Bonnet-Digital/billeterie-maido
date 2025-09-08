-- Backfill reservations.time_slot_id using event_activity_id when determinable
-- If an event activity has exactly one time slot in history,
-- assign that slot to reservations lacking time_slot_id.
UPDATE reservations r
SET time_slot_id = ts.id
FROM time_slots ts
WHERE r.time_slot_id IS NULL
  AND r.event_activity_id = ts.event_activity_id
  AND (
    SELECT COUNT(*) FROM time_slots ts2
    WHERE ts2.event_activity_id = r.event_activity_id
  ) = 1;
