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

-- 3) Add guaranteed_runs (optional) to passes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'passes' AND column_name = 'guaranteed_runs'
  ) THEN
    ALTER TABLE passes ADD COLUMN guaranteed_runs integer;
  END IF;
END $$;

-- 4) For event_activities linked to Poney or Tir à l'arc, enforce requires_time_slot = true
UPDATE event_activities ea
SET requires_time_slot = true
FROM activities a
WHERE ea.activity_id = a.id
  AND a.name IN ('poney', 'tir_arc')
  AND (ea.requires_time_slot IS DISTINCT FROM true);

-- 5) Upsert passes for the demo event, with guaranteed_runs as needed
DO $$
DECLARE
  demo_event uuid;
  poney_ea uuid;
  tir_ea uuid;
BEGIN
  SELECT id INTO demo_event FROM events WHERE id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1;
  IF demo_event IS NOT NULL THEN
    SELECT ea.id INTO poney_ea FROM event_activities ea JOIN activities a ON a.id = ea.activity_id WHERE ea.event_id = demo_event AND a.name = 'poney' LIMIT 1;
    SELECT ea.id INTO tir_ea FROM event_activities ea JOIN activities a ON a.id = ea.activity_id WHERE ea.event_id = demo_event AND a.name = 'tir_arc' LIMIT 1;

    -- Insert if not exists by name for that event
    IF NOT EXISTS (
      SELECT 1 FROM passes WHERE event_id = demo_event AND name = 'Baby Poney'
    ) THEN
      INSERT INTO passes (event_id, name, price, description, initial_stock, pass_type, guaranteed_runs)
      VALUES (demo_event, 'Baby Poney', 2.00, 'Billet Baby Poney (créneau requis).', 15, 'baby_poney', NULL);
    ELSE
      UPDATE passes
      SET price = 2.00,
          initial_stock = 15,
          pass_type = 'baby_poney',
          guaranteed_runs = NULL
      WHERE event_id = demo_event AND name = 'Baby Poney';
    END IF;

    -- Pass Moins de 8 ans (luge + 1 poney)
    INSERT INTO passes (event_id, name, price, description, initial_stock, pass_type, guaranteed_runs)
    VALUES (demo_event, 'Pass Moins de 8 ans', 9.00, 'Luge illimitée (tours garantis) + 1 tour de Poney', NULL, 'moins_8', 3)
    ON CONFLICT (event_id, name) DO UPDATE SET
      price = EXCLUDED.price,
      description = EXCLUDED.description,
      initial_stock = EXCLUDED.initial_stock,
      pass_type = EXCLUDED.pass_type,
      guaranteed_runs = EXCLUDED.guaranteed_runs;

    -- Pass Plus de 8 ans (luge + 1 tir à l'arc)
    INSERT INTO passes (event_id, name, price, description, initial_stock, pass_type, guaranteed_runs)
    VALUES (demo_event, 'Pass Plus de 8 ans', 9.00, 'Luge illimitée (tours garantis) + 1 session de Tir à l\'Arc', NULL, 'plus_8', 3)
    ON CONFLICT (event_id, name) DO UPDATE SET
      price = EXCLUDED.price,
      description = EXCLUDED.description,
      initial_stock = EXCLUDED.initial_stock,
      pass_type = EXCLUDED.pass_type,
      guaranteed_runs = EXCLUDED.guaranteed_runs;

    -- Pass Luge Seule (luge illimitée, vendu quand autres épuisés)
    INSERT INTO passes (event_id, name, price, description, initial_stock, pass_type, guaranteed_runs)
    VALUES (demo_event, 'Pass Luge Seule', 7.00, 'Luge illimitée (tours garantis). Vendu uniquement quand les autres pass sont épuisés.', NULL, 'luge_seule', 3)
    ON CONFLICT (event_id, name) DO UPDATE SET
      price = EXCLUDED.price,
      description = EXCLUDED.description,
      initial_stock = EXCLUDED.initial_stock,
      pass_type = EXCLUDED.pass_type,
      guaranteed_runs = EXCLUDED.guaranteed_runs;

    -- Link passes to activities via pass_activities
    -- moins_8 -> poney
    IF poney_ea IS NOT NULL THEN
      INSERT INTO pass_activities (pass_id, event_activity_id)
      SELECT p.id, poney_ea FROM passes p WHERE p.event_id = demo_event AND p.name = 'Pass Moins de 8 ans'
      ON CONFLICT DO NOTHING;
    END IF;
    -- plus_8 -> tir_arc
    IF tir_ea IS NOT NULL THEN
      INSERT INTO pass_activities (pass_id, event_activity_id)
      SELECT p.id, tir_ea FROM passes p WHERE p.event_id = demo_event AND p.name = 'Pass Plus de 8 ans'
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- 6) Recreate RPC to include pass_type and guaranteed_runs in passes payload
DROP FUNCTION IF EXISTS get_event_passes_activities_stock(uuid);
CREATE OR REPLACE FUNCTION get_event_passes_activities_stock(event_uuid uuid)
RETURNS json AS $$
  SELECT json_build_object(
    'passes', COALESCE((
      SELECT json_agg(json_build_object(
        'id', p.id,
        'name', p.name,
        'price', p.price,
        'description', p.description,
        'initial_stock', p.initial_stock,
        'pass_type', p.pass_type,
        'guaranteed_runs', p.guaranteed_runs,
        'remaining_stock', get_pass_remaining_stock(p.id)
      ))
      FROM passes p
      WHERE p.event_id = event_uuid
    ), '[]'::json),
    'event_activities', COALESCE((
      SELECT json_agg(json_build_object(
        'id', ea.id,
        'activity_id', ea.activity_id,
        'stock_limit', ea.stock_limit,
        'requires_time_slot', ea.requires_time_slot,
        'activity', json_build_object(
          'id', a.id,
          'name', a.name,
          'description', a.description,
          'icon', a.icon
        ),
        'remaining_stock', get_event_activity_remaining_stock(ea.id)
      ))
      FROM event_activities ea
      JOIN activities a ON a.id = ea.activity_id
      WHERE ea.event_id = event_uuid
    ), '[]'::json)
  );
$$ LANGUAGE sql SECURITY DEFINER;
