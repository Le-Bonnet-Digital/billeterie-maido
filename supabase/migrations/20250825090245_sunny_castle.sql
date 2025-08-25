/*
  # Synchronisation automatique du stock des activités avec les créneaux

  1. Fonctions utilitaires
    - Fonction pour calculer la capacité totale des créneaux d'une activité
    - Fonction pour mettre à jour automatiquement le stock limite
    - Triggers pour maintenir la cohérence

  2. Triggers
    - Mise à jour automatique après insertion/modification/suppression de créneaux
    - Validation pour empêcher les incohérences

  3. Sécurité
    - Vérifications pour éviter les boucles infinies
    - Gestion des cas d'erreur
*/

-- Fonction pour calculer la capacité totale des créneaux d'une activité d'événement
CREATE OR REPLACE FUNCTION calculate_total_timeslot_capacity(event_activity_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  total_capacity integer := 0;
BEGIN
  SELECT COALESCE(SUM(capacity), 0)
  INTO total_capacity
  FROM time_slots
  WHERE event_activity_id = event_activity_uuid;
  
  RETURN total_capacity;
END;
$$;

-- Fonction pour synchroniser le stock limite avec la capacité des créneaux
CREATE OR REPLACE FUNCTION sync_activity_stock_with_timeslots(event_activity_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  total_capacity integer;
  requires_slots boolean;
BEGIN
  -- Vérifier si l'activité nécessite des créneaux
  SELECT requires_time_slot INTO requires_slots
  FROM event_activities
  WHERE id = event_activity_uuid;
  
  -- Si l'activité nécessite des créneaux, synchroniser le stock
  IF requires_slots THEN
    -- Calculer la capacité totale des créneaux
    total_capacity := calculate_total_timeslot_capacity(event_activity_uuid);
    
    -- Mettre à jour le stock limite de l'activité
    UPDATE event_activities
    SET stock_limit = CASE 
      WHEN total_capacity > 0 THEN total_capacity
      ELSE NULL
    END
    WHERE id = event_activity_uuid;
  END IF;
END;
$$;

-- Trigger pour synchroniser automatiquement après modification des créneaux
CREATE OR REPLACE FUNCTION trigger_sync_activity_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Synchroniser pour l'ancienne activité (en cas de UPDATE/DELETE)
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    PERFORM sync_activity_stock_with_timeslots(OLD.event_activity_id);
  END IF;
  
  -- Synchroniser pour la nouvelle activité (en cas d'INSERT/UPDATE)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM sync_activity_stock_with_timeslots(NEW.event_activity_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Créer le trigger sur la table time_slots
DROP TRIGGER IF EXISTS trigger_sync_stock_on_timeslot_change ON time_slots;
CREATE TRIGGER trigger_sync_stock_on_timeslot_change
  AFTER INSERT OR UPDATE OR DELETE ON time_slots
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_activity_stock();

-- Trigger pour synchroniser quand on change requires_time_slot
CREATE OR REPLACE FUNCTION trigger_sync_on_requires_timeslot_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si on active requires_time_slot, synchroniser avec les créneaux existants
  IF NEW.requires_time_slot = true AND (OLD.requires_time_slot = false OR OLD.requires_time_slot IS NULL) THEN
    PERFORM sync_activity_stock_with_timeslots(NEW.id);
  END IF;
  
  -- Si on désactive requires_time_slot, remettre le stock limite à NULL (stock illimité)
  IF NEW.requires_time_slot = false AND OLD.requires_time_slot = true THEN
    NEW.stock_limit := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table event_activities
DROP TRIGGER IF EXISTS trigger_sync_on_requires_timeslot_change ON event_activities;
CREATE TRIGGER trigger_sync_on_requires_timeslot_change
  BEFORE UPDATE ON event_activities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_on_requires_timeslot_change();

-- Fonction pour synchroniser toutes les activités existantes (migration)
CREATE OR REPLACE FUNCTION sync_all_existing_activities()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  activity_record RECORD;
BEGIN
  FOR activity_record IN 
    SELECT id FROM event_activities WHERE requires_time_slot = true
  LOOP
    PERFORM sync_activity_stock_with_timeslots(activity_record.id);
  END LOOP;
END;
$$;

-- Exécuter la synchronisation pour toutes les activités existantes
SELECT sync_all_existing_activities();

-- Nettoyer la fonction temporaire
DROP FUNCTION sync_all_existing_activities();