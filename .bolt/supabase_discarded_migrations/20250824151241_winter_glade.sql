/*
  # Drop obsolete activity column from time_slots

  1. Changes
    - Remove the obsolete `activity` column from `time_slots` table
    - This column is redundant as activity information is now accessed via event_activities relationship

  2. Notes
    - This migration is safe to run as the column is no longer used in the application
    - All activity data is preserved in the activities table and linked via event_activities
*/

-- Drop the obsolete activity column from time_slots table
ALTER TABLE public.time_slots DROP COLUMN IF EXISTS activity;