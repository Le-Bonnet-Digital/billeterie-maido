

-- Fonction pour calculer le stock maximum d'un pass basé sur ses activités
CREATE OR REPLACE FUNCTION get_pass_max_stock_from_activities(pass_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  min_activity_stock integer := 999999;

  activity_stock integer;

  activity_record RECORD;

BEGIN
  -- Parcourir toutes les activités liées au pass
  FOR activity_record IN
    SELECT ea.id, ea.stock_limit
    FROM pass_activities pa
    JOIN event_activities ea ON ea.id = pa.event_activity_id
    WHERE pa.pass_id = pass_uuid
  LOOP
    -- Si l'activité a une limite de stock
    IF activity_record.stock_limit IS NOT NULL THEN
      -- Calculer le stock restant pour cette activité
      SELECT get_event_activity_remaining_stock(activity_record.id) INTO activity_stock;

      
      -- Prendre le minimum
      IF activity_stock < min_activity_stock THEN
        min_activity_stock := activity_stock;

      END IF;

    END IF;

  END LOOP;

  
  RETURN min_activity_stock;

END;

$$;


-- Fonction pour calculer le stock effectif restant d'un pass
CREATE OR REPLACE FUNCTION get_pass_effective_remaining_stock(pass_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pass_stock integer;

  activity_max_stock integer;

BEGIN
  -- Récupérer le stock du pass lui-même
  SELECT get_pass_remaining_stock(pass_uuid) INTO pass_stock;

  
  -- Récupérer le stock maximum basé sur les activités
  SELECT get_pass_max_stock_from_activities(pass_uuid) INTO activity_max_stock;

  
  -- Retourner le minimum des deux
  RETURN LEAST(COALESCE(pass_stock, 999999), COALESCE(activity_max_stock, 999999));

END;

$$;


-- Fonction pour vérifier si un pass peut être réservé
CREATE OR REPLACE FUNCTION can_reserve_pass(pass_uuid uuid, quantity integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  effective_stock integer;

BEGIN
  SELECT get_pass_effective_remaining_stock(pass_uuid) INTO effective_stock;

  
  RETURN effective_stock >= quantity;

END;

$$;
;

