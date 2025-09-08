-- Backfill missing pass_id in time_slots and event_activity_id in reservations

-- Populate pass_id for existing time slots based on pass_activities
UPDATE time_slots ts
SET pass_id = pa.pass_id
FROM pass_activities pa
WHERE ts.pass_id IS NULL
  AND ts.event_activity_id = pa.event_activity_id;

-- Populate event_activity_id in reservations from related time slot
UPDATE reservations r
SET event_activity_id = ts.event_activity_id
FROM time_slots ts
WHERE r.event_activity_id IS NULL
  AND r.time_slot_id = ts.id;

-- Fallback: populate event_activity_id using pass_activities when no time slot
UPDATE reservations r
SET event_activity_id = pa.event_activity_id
FROM pass_activities pa
WHERE r.event_activity_id IS NULL
  AND r.time_slot_id IS NULL
  AND r.pass_id = pa.pass_id;
