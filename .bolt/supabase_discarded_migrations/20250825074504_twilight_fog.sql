/*
  # Correction architecture créneaux - Liaison avec activités d'événement

  1. Modifications
    - Rendre pass_id nullable dans time_slots
    - S'assurer que event_activity_id est requis
    - Ajouter contrainte pour s'assurer qu'au moins un des deux (pass_id ou event_activity_id) est défini

  2. Logique
    - Les créneaux sont maintenant principalement liés aux activités d'événement
    - Si une activité est dans plusieurs pass, tous les pass partagent les mêmes créneaux
    - Gestion cohérente des capacités par activité
*/

-- Rendre pass_id nullable dans time_slots
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_slots' AND column_name = 'pass_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE time_slots ALTER COLUMN pass_id DROP NOT NULL;
  END IF;
END $$;

-- S'assurer que event_activity_id est non-null
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_slots' AND column_name = 'event_activity_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE time_slots ALTER COLUMN event_activity_id SET NOT NULL;
  END IF;
END $$;

-- Ajouter une contrainte pour s'assurer qu'au moins event_activity_id est défini
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'time_slots' AND constraint_name = 'time_slots_activity_required'
  ) THEN
    ALTER TABLE time_slots ADD CONSTRAINT time_slots_activity_required 
    CHECK (event_activity_id IS NOT NULL);
  END IF;
END $$;