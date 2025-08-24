/*
  # Remove obsolete activity column from time_slots table

  This migration safely removes the `activity` column from the `time_slots` table
  if it exists. This column is redundant since activity information is now
  accessed through the event_activities relationship.

  1. Changes
     - Drop `activity` column from `time_slots` table if it exists
  
  2. Safety
     - Uses IF EXISTS to prevent errors if column doesn't exist
     - Only affects the public schema
*/

-- Check if the column exists before trying to drop it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_slots' 
    AND column_name = 'activity'
  ) THEN
    ALTER TABLE public.time_slots DROP COLUMN activity;
    RAISE NOTICE 'Column activity dropped from time_slots table';
  ELSE
    RAISE NOTICE 'Column activity does not exist in time_slots table';
  END IF;
END $$;