\n\n-- First, let's see what we're working with and clean up invalid data\nDO $$\nBEGIN\n  -- Delete time_slots that have null event_activity_id and cannot be fixed\n  DELETE FROM time_slots \n  WHERE event_activity_id IS NULL;
\n  \n  -- Log how many were deleted\n  RAISE NOTICE 'Cleaned up time_slots with null event_activity_id';
\nEND $$;
\n\n-- Now we can safely make the column NOT NULL\nALTER TABLE time_slots ALTER COLUMN event_activity_id SET NOT NULL;
\n\n-- Make pass_id nullable (time slots are now primarily linked to activities)\nALTER TABLE time_slots ALTER COLUMN pass_id DROP NOT NULL;
\n\n-- Add a comment to clarify the new structure\nCOMMENT ON COLUMN time_slots.event_activity_id IS 'Required: Links time slot to a specific activity within an event';
\nCOMMENT ON COLUMN time_slots.pass_id IS 'Optional: Can be null if time slot applies to all passes containing the activity';
;
