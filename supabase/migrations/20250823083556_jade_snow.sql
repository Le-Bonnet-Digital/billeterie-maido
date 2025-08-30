/*
  # Configuration complète de la base de données pour l'application de billetterie

  1. Tables créées
    - `users` (utilisateurs avec rôles)
    - `events` (événements)
    - `passes` (types de billets)
    - `time_slots` (créneaux horaires pour activités)
    - `reservations` (réservations clients)
    - `cart_items` (panier temporaire)

  2. Fonctions
    - `get_pass_remaining_stock` (calcul stock restant)
    - `get_slot_remaining_capacity` (calcul places restantes)
    - `cleanup_expired_cart_items` (nettoyage panier expiré)
    - `set_reservation_number` (génération numéro réservation)

  3. Données initiales
    - Événement "Les Défis Lontan" avec tous ses pass et créneaux
*/

-- Supprimer les tables existantes (dans l'ordre inverse des dépendances)
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS passes CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Supprimer les fonctions existantes
DROP FUNCTION IF EXISTS get_pass_remaining_stock(uuid);
DROP FUNCTION IF EXISTS get_slot_remaining_capacity(uuid);
DROP FUNCTION IF EXISTS cleanup_expired_cart_items();
DROP FUNCTION IF EXISTS set_reservation_number();

-- Activer l'extension UUID si pas déjà fait
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table users (créée en premier car référencée par les autres)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'pony_provider', 'archery_provider', 'client')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (auth.role() = 'admin');

-- 2. Table events
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  event_date date NOT NULL,
  sales_opening_date timestamptz NOT NULL,
  sales_closing_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'finished', 'cancelled')),
  cgv_content text DEFAULT '',
  faq_content text DEFAULT '',
  key_info_content text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published events"
  ON events FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  USING (auth.role() = 'admin');

-- Index pour optimiser les requêtes
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_dates ON events(event_date, sales_opening_date, sales_closing_date);

-- 3. Table passes
CREATE TABLE passes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL,
  description text DEFAULT '',
  initial_stock integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view passes for published events"
  ON passes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM events e 
    WHERE e.id = passes.event_id AND e.status = 'published'
  ));

CREATE POLICY "Admins can manage passes"
  ON passes FOR ALL
  USING (auth.role() = 'admin');

CREATE INDEX idx_passes_event ON passes(event_id);

-- 4. Table time_slots
CREATE TABLE time_slots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  activity text NOT NULL CHECK (activity IN ('poney', 'tir_arc')),
  slot_time timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 15,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view time slots for published events"
  ON time_slots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM events e 
    WHERE e.id = time_slots.event_id AND e.status = 'published'
  ));

CREATE POLICY "Admins can manage time slots"
  ON time_slots FOR ALL
  USING (auth.role() = 'admin');

CREATE INDEX idx_time_slots_event ON time_slots(event_id, activity);

-- 6. Table reservations
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_number text UNIQUE NOT NULL,
  client_email text NOT NULL,
  pass_id uuid REFERENCES passes(id),
  time_slot_id uuid REFERENCES time_slots(id),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reservations by email"
  ON reservations FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage all reservations"
  ON reservations FOR ALL
  USING (auth.role() = 'admin');

CREATE INDEX idx_reservations_email ON reservations(client_email);

-- 7. Table cart_items
CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id text NOT NULL,
  pass_id uuid REFERENCES passes(id),
  time_slot_id uuid REFERENCES time_slots(id),
  quantity integer NOT NULL DEFAULT 1,
  reserved_until timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage their cart items"
  ON cart_items FOR ALL
  USING (true);

CREATE INDEX idx_cart_items_session ON cart_items(session_id);
CREATE INDEX idx_cart_items_reserved_until ON cart_items(reserved_until);

-- FONCTIONS UTILITAIRES

-- Fonction pour calculer le stock restant d'un pass
CREATE OR REPLACE FUNCTION get_pass_remaining_stock(pass_uuid uuid)
RETURNS integer AS $$
DECLARE
  initial_stock_val integer;
  reserved_count integer;
  sold_count integer;
  total_used integer;
BEGIN
  -- Récupérer le stock initial
  SELECT initial_stock INTO initial_stock_val
  FROM passes 
  WHERE id = pass_uuid;
  
  -- Si stock illimité, retourner une grande valeur
  IF initial_stock_val IS NULL THEN
    RETURN 999999;
  END IF;
  
  -- Compter les réservations dans le panier (non expirées)
  SELECT COALESCE(SUM(quantity), 0) INTO reserved_count
  FROM cart_items 
  WHERE pass_id = pass_uuid 
    AND reserved_until > now();
  
  -- Compter les réservations payées
  SELECT COUNT(*) INTO sold_count
  FROM reservations 
  WHERE pass_id = pass_uuid 
    AND payment_status = 'paid';
  
  total_used := COALESCE(reserved_count, 0) + COALESCE(sold_count, 0);
  
  RETURN GREATEST(0, initial_stock_val - total_used);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour calculer la capacité restante d'un créneau
CREATE OR REPLACE FUNCTION get_slot_remaining_capacity(slot_uuid uuid)
RETURNS integer AS $$
DECLARE
  slot_capacity integer;
  reserved_count integer;
  sold_count integer;
  total_used integer;
BEGIN
  -- Récupérer la capacité du créneau
  SELECT capacity INTO slot_capacity
  FROM time_slots 
  WHERE id = slot_uuid;
  
  -- Compter les réservations dans le panier (non expirées)
  SELECT COALESCE(SUM(quantity), 0) INTO reserved_count
  FROM cart_items 
  WHERE time_slot_id = slot_uuid 
    AND reserved_until > now();
  
  -- Compter les réservations payées
  SELECT COUNT(*) INTO sold_count
  FROM reservations 
  WHERE time_slot_id = slot_uuid 
    AND payment_status = 'paid';
  
  total_used := COALESCE(reserved_count, 0) + COALESCE(sold_count, 0);
  
  RETURN GREATEST(0, slot_capacity - total_used);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour nettoyer les articles expirés du panier
CREATE OR REPLACE FUNCTION cleanup_expired_cart_items()
RETURNS void AS $$
BEGIN
  DELETE FROM cart_items 
  WHERE reserved_until <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour générer un numéro de réservation unique
CREATE OR REPLACE FUNCTION set_reservation_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.reservation_number IS NULL OR NEW.reservation_number = '' THEN
    NEW.reservation_number := 'RES-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer automatiquement le numéro de réservation
CREATE TRIGGER trigger_set_reservation_number
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_reservation_number();

-- INSERTION DES DONNÉES INITIALES

-- Insérer l'événement "Les Défis Lontan"
INSERT INTO events (
  id,
  name,
  event_date,
  sales_opening_date,
  sales_closing_date,
  status,
  cgv_content,
  faq_content,
  key_info_content
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Les Défis Lontan',
  '2025-03-15',
  '2025-01-15 09:00:00+00',
  '2025-03-14 23:59:59+00',
  'published',
  'Conditions Générales de Vente

### Article 1 - Objet
Les présentes conditions générales de vente régissent les relations contractuelles entre l''organisateur et les participants à l''événement "Les Défis Lontan".

### Article 2 - Billetterie
- Les billets sont nominatifs et non remboursables sauf annulation de l''événement
- En cas d''annulation, le remboursement sera effectué sous 30 jours
- Les billets ne peuvent être revendus

### Article 3 - Responsabilité
L''organisateur décline toute responsabilité en cas d''accident lors des activités. Une assurance responsabilité civile est recommandée.

### Article 4 - Droit applicable
Ces conditions sont soumises au droit français.',
  'Questions Fréquemment Posées

### Informations Générales

**Q : "À quelle heure commence l''événement ?"**
**R : "L''événement se déroule de 9h00 à 18h00. Les activités commencent dès 9h30."**

**Q : "Où se déroule l''événement ?"**
**R : "L''événement a lieu au Parc des Loisirs de Saint-Pierre, 123 Route des Aventures, 97410 Saint-Pierre."**

**Q : "Y a-t-il un parking disponible ?"**
**R : "Oui, un parking gratuit de 200 places est disponible sur site."**

### Billets et Réservations

**Q : "Puis-je annuler ma réservation ?"**
**R : "Les billets ne sont pas remboursables sauf en cas d''annulation de l''événement par l''organisateur."**

**Q : "Puis-je modifier mon créneau horaire ?"**
**R : "Les modifications de créneaux sont possibles jusqu''à 48h avant l''événement, sous réserve de disponibilité."**

**Q : "Que faire si je perds mon billet ?"**
**R : "Utilisez la fonction ''Retrouver mon billet'' sur le site avec votre adresse e-mail de réservation."**

### Activités

**Q : "À partir de quel âge peut-on faire du poney ?"**
**R : "L''activité poney est accessible dès 3 ans, avec accompagnement obligatoire pour les moins de 8 ans."**

**Q : "Le tir à l''arc est-il sécurisé ?"**
**R : "Oui, l''activité est encadrée par des moniteurs diplômés avec tout l''équipement de sécurité fourni."**

### Restauration et Services

**Q : "Y a-t-il de la restauration sur place ?"**
**R : "Oui, plusieurs stands de restauration locale seront présents, ainsi qu''une buvette."**

**Q : "L''événement a-t-il lieu en cas de pluie ?"**
**R : "L''événement est maintenu par temps de pluie. Des abris sont prévus pour les activités."**',
  'Venez vivre une journée exceptionnelle au cœur de la tradition réunionnaise ! 

🏇 **Activités Poney** : Découverte et initiation pour tous les âges
🏹 **Tir à l''Arc** : Perfectionnement et compétition amicale
🎪 **Animations** : Spectacles, musique traditionnelle et danses locales
🍽️ **Restauration** : Spécialités créoles et produits du terroir

**Lieu :** Parc des Loisirs de Saint-Pierre
**Horaires :** 9h00 - 18h00
**Parking gratuit** disponible sur site

Un événement familial dans un cadre naturel exceptionnel, alliant tradition et modernité pour le plaisir de tous !'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  event_date = EXCLUDED.event_date,
  sales_opening_date = EXCLUDED.sales_opening_date,
  sales_closing_date = EXCLUDED.sales_closing_date,
  status = EXCLUDED.status,
  cgv_content = EXCLUDED.cgv_content,
  faq_content = EXCLUDED.faq_content,
  key_info_content = EXCLUDED.key_info_content,
  updated_at = now();

-- Insérer les pass pour l'événement
INSERT INTO passes (id, event_id, name, price, description, initial_stock) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Pass Marmaille', 15.00, 'Pass enfant (3-12 ans) avec accès aux activités poney et tir à l''arc. Créneau horaire obligatoire.', 50),
  ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Pass Tangue', 25.00, 'Pass adulte avec accès aux activités poney et tir à l''arc. Créneau horaire obligatoire.', 100),
  ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Pass Papangue', 35.00, 'Pass premium avec accès prioritaire et activités supplémentaires. Créneau horaire obligatoire.', 30),
  ('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Pass Spectateur', 8.00, 'Accès aux spectacles et animations, restauration. Pas d''activités sportives.', NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  initial_stock = EXCLUDED.initial_stock;

-- Insérer les créneaux horaires pour les activités
INSERT INTO time_slots (id, event_id, activity, slot_time, capacity) VALUES
  -- Créneaux Poney (matin)
  ('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 09:30:00+00', 15),
  ('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 10:30:00+00', 15),
  ('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 11:30:00+00', 15),
  -- Créneaux Poney (après-midi)
  ('750e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 14:00:00+00', 15),
  ('750e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 15:00:00+00', 15),
  ('750e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 16:00:00+00', 15),
  -- Créneaux Tir à l'Arc (matin)
  ('750e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 09:30:00+00', 12),
  ('750e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 10:30:00+00', 12),
  ('750e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 11:30:00+00', 12),
  -- Créneaux Tir à l'Arc (après-midi)
  ('750e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 14:00:00+00', 12),
  ('750e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 15:00:00+00', 12),
  ('750e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 16:00:00+00', 12)
ON CONFLICT (id) DO UPDATE SET
  activity = EXCLUDED.activity,
  slot_time = EXCLUDED.slot_time,
  capacity = EXCLUDED.capacity;

-- Fonction de nettoyage automatique des articles expirés du panier
CREATE OR REPLACE FUNCTION cleanup_expired_cart_items()
RETURNS void AS $$
BEGIN
  DELETE FROM cart_items 
  WHERE reserved_until <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour générer un numéro de réservation unique
CREATE OR REPLACE FUNCTION set_reservation_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.reservation_number IS NULL OR NEW.reservation_number = '' THEN
    NEW.reservation_number := 'RES-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Base de données configurée avec succès !';
  RAISE NOTICE 'Événement "Les Défis Lontan" créé avec % pass et % créneaux horaires.', 
    (SELECT COUNT(*) FROM passes WHERE event_id = '550e8400-e29b-41d4-a716-446655440000'),
    (SELECT COUNT(*) FROM time_slots WHERE event_id = '550e8400-e29b-41d4-a716-446655440000');
END $$;