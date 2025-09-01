-- Add pass_type to passes and enforce time slots for Poney and Tir

-- 1) Add column pass_type if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'passes' AND column_name = 'pass_type'
  ) THEN
    ALTER TABLE passes ADD COLUMN pass_type text;
  END IF;
END $$;
-- 2) Ensure CHECK constraint allows only supported values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.passes'::regclass
      AND contype = 'c'
      AND conname = 'passes_pass_type_check'
  ) THEN
    ALTER TABLE public.passes
      ADD CONSTRAINT passes_pass_type_check
      CHECK (pass_type IS NULL OR pass_type IN ('moins_8','plus_8','luge_seule','baby_poney'));
  END IF;
END $$;
-- 3) For event_activities linked to Poney or Tir à l'arc, enforce requires_time_slot = true
UPDATE event_activities ea
SET requires_time_slot = true
FROM activities a
WHERE ea.activity_id = a.id
  AND a.name IN ('poney', 'tir_arc')
  AND (ea.requires_time_slot IS DISTINCT FROM true);
-- 4) Upsert Baby Poney pass (2€) with initial_stock=15 for the seeded demo event, if it exists
DO $$
DECLARE
  demo_event uuid;
BEGIN
  SELECT id INTO demo_event FROM events WHERE id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1;
  IF demo_event IS NOT NULL THEN
    -- Insert if not exists by name for that event
    IF NOT EXISTS (
      SELECT 1 FROM passes WHERE event_id = demo_event AND name = 'Baby Poney'
    ) THEN
      INSERT INTO passes (event_id, name, price, description, initial_stock, pass_type)
      VALUES (demo_event, 'Baby Poney', 2.00, 'Billet Baby Poney (créneau requis).', 15, 'baby_poney');
    ELSE
      UPDATE passes
      SET price = 2.00,
          initial_stock = 15,
          pass_type = 'baby_poney'
      WHERE event_id = demo_event AND name = 'Baby Poney';
    END IF;
  END IF;
END $$;
