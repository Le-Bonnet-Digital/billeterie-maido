/*
  # Remove obsolete activity column from time_slots table

  1. Changes
    - Drop the `activity` column from `time_slots` table
    - This column is redundant as activity information is now accessed via `event_activity_id` relationship

  2. Reason
    - The `activity` column was causing query errors as it's no longer used
    - Activity data is now properly normalized through the `event_activities` and `activities` tables
*/

-- Drop the obsolete activity column from time_slots table
ALTER TABLE public.time_slots DROP COLUMN IF EXISTS activity;