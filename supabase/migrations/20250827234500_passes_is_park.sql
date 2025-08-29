-- Single-boutique model for park tickets: mark passes as park-level
ALTER TABLE passes
  ADD COLUMN IF NOT EXISTS is_park boolean DEFAULT false;

-- Allow park passes without binding to an event
DO $$
BEGIN
  BEGIN
    ALTER TABLE passes ALTER COLUMN event_id DROP NOT NULL;
  EXCEPTION WHEN others THEN
    -- ignore if already nullable
    NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_passes_is_park ON passes(is_park);

