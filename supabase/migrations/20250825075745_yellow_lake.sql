

-- First, let's see what we're working with and clean up invalid data
DO $$
BEGIN
  -- Delete time_slots that have null event_activity_id and cannot be fixed
  DELETE FROM time_slots 
  WHERE event_activity_id IS NULL;

  
  -- Log how many were deleted
  RAISE NOTICE 'Cleaned up time_slots with null event_activity_id';

END $$;


-- Now we can safely make the column NOT NULL
ALTER TABLE time_slots ALTER COLUMN event_activity_id SET NOT NULL;


-- Make pass_id nullable (time slots are now primarily linked to activities)
ALTER TABLE time_slots ALTER COLUMN pass_id DROP NOT NULL;


-- Add a comment to clarify the new structure
COMMENT ON COLUMN time_slots.event_activity_id IS 'Required: Links time slot to a specific activity within an event';

COMMENT ON COLUMN time_slots.pass_id IS 'Optional: Can be null if time slot applies to all passes containing the activity';
;

