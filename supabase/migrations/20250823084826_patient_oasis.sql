

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- 1. Table des utilisateurs (créée en premier)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  role text DEFAULT 'client' CHECK (role IN ('admin', 'pony_provider', 'archery_provider', 'client')),
  created_at timestamptz DEFAULT now()
);


-- RLS pour users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON users FOR SELECT
      USING (id = auth.uid());

  END IF;

END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Admins can view all users'
  ) THEN
    CREATE POLICY "Admins can view all users"
      ON users FOR SELECT
      USING (auth.role() = 'admin');

  END IF;

END $$;


-- 2. Table des événements
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_date date NOT NULL,
  sales_opening_date timestamptz NOT NULL,
  sales_closing_date timestamptz NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'finished', 'cancelled')),
  cgv_content text DEFAULT '',
  faq_content text DEFAULT '',
  key_info_content text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- Index pour les événements
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

CREATE INDEX IF NOT EXISTS idx_events_dates ON events(event_date, sales_opening_date, sales_closing_date);


-- RLS pour events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'events' AND policyname = 'Anyone can view published events'
  ) THEN
    CREATE POLICY "Anyone can view published events"
      ON events FOR SELECT
      USING (status = 'published');

  END IF;

END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'events' AND policyname = 'Admins can manage events'
  ) THEN
    CREATE POLICY "Admins can manage events"
      ON events FOR ALL
      USING (auth.role() = 'admin');

  END IF;

END $$;


-- 3. Table des pass
CREATE TABLE IF NOT EXISTS passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL,
  description text DEFAULT '',
  initial_stock integer,
  created_at timestamptz DEFAULT now()
);


-- Index pour les pass
CREATE INDEX IF NOT EXISTS idx_passes_event ON passes(event_id);


-- RLS pour passes
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'passes' AND policyname = 'Anyone can view passes for published events'
  ) THEN
    CREATE POLICY "Anyone can view passes for published events"
      ON passes FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM events e 
        WHERE e.id = passes.event_id AND e.status = 'published'
      ));

  END IF;

END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'passes' AND policyname = 'Admins can manage passes'
  ) THEN
    CREATE POLICY "Admins can manage passes"
      ON passes FOR ALL
      USING (auth.role() = 'admin');

  END IF;

END $$;


-- 4. Table des créneaux horaires
CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  activity text NOT NULL CHECK (activity IN ('poney', 'tir_arc')),
  slot_time timestamptz NOT NULL,
  capacity integer DEFAULT 15 NOT NULL,
  created_at timestamptz DEFAULT now()
);


-- Index pour les créneaux
CREATE INDEX IF NOT EXISTS idx_time_slots_event ON time_slots(event_id, activity);


-- RLS pour time_slots
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'time_slots' AND policyname = 'Anyone can view time slots for published events'
  ) THEN
    CREATE POLICY "Anyone can view time slots for published events"
      ON time_slots FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM events e 
        WHERE e.id = time_slots.event_id AND e.status = 'published'
      ));

  END IF;

END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'time_slots' AND policyname = 'Admins can manage time slots'
  ) THEN
    CREATE POLICY "Admins can manage time slots"
      ON time_slots FOR ALL
      USING (auth.role() = 'admin');

  END IF;

END $$;


-- 5. Table des ressources poney
CREATE TABLE IF NOT EXISTS pony_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  initial_stock integer NOT NULL,
  created_at timestamptz DEFAULT now()
);


-- RLS pour pony_resources
ALTER TABLE pony_resources ENABLE ROW LEVEL SECURITY;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pony_resources' AND policyname = 'Admins can manage pony resources'
  ) THEN
    CREATE POLICY "Admins can manage pony resources"
      ON pony_resources FOR ALL
      USING (auth.role() = 'admin');

  END IF;

END $$;


-- 6. Table des réservations
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number text UNIQUE NOT NULL,
  client_email text NOT NULL,
  pass_id uuid REFERENCES passes(id),
  time_slot_id uuid REFERENCES time_slots(id),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
  created_at timestamptz DEFAULT now()
);


-- Index pour les réservations (avec IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS reservations_reservation_number_key ON reservations(reservation_number);

CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(client_email);


-- RLS pour reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reservations' AND policyname = 'Users can view reservations by email'
  ) THEN
    CREATE POLICY "Users can view reservations by email"
      ON reservations FOR SELECT
      USING (true);

  END IF;

END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reservations' AND policyname = 'Admins can manage all reservations'
  ) THEN
    CREATE POLICY "Admins can manage all reservations"
      ON reservations FOR ALL
      USING (auth.role() = 'admin');

  END IF;

END $$;


-- 7. Table des articles du panier
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  pass_id uuid REFERENCES passes(id),
  time_slot_id uuid REFERENCES time_slots(id),
  quantity integer DEFAULT 1 NOT NULL,
  reserved_until timestamptz DEFAULT (now() + interval '10 minutes') NOT NULL,
  created_at timestamptz DEFAULT now()
);


-- Index pour les articles du panier
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items(session_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_reserved_until ON cart_items(reserved_until);


-- RLS pour cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items' AND policyname = 'Anyone can manage their cart items'
  ) THEN
    CREATE POLICY "Anyone can manage their cart items"
      ON cart_items FOR ALL
      USING (true);

  END IF;

END $$;


-- FONCTIONS

-- Fonction pour générer un numéro de réservation
CREATE OR REPLACE FUNCTION set_reservation_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reservation_number := 'RES-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(EXTRACT(DOY FROM NOW())::text, 3, '0') || '-' || LPAD((RANDOM() * 9999)::int::text, 4, '0');

  RETURN NEW;

END;

$$ LANGUAGE plpgsql;


-- Trigger pour générer automatiquement le numéro de réservation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_set_reservation_number'
  ) THEN
    CREATE TRIGGER trigger_set_reservation_number
      BEFORE INSERT ON reservations
      FOR EACH ROW
      EXECUTE FUNCTION set_reservation_number();

  END IF;

END $$;


-- Fonction pour calculer le stock restant d'un pass
CREATE OR REPLACE FUNCTION get_pass_remaining_stock(pass_uuid uuid)
RETURNS integer AS $$
DECLARE
  initial_stock_val integer;

  reserved_count integer;

  sold_count integer;

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

  
  -- Retourner le stock disponible
  RETURN GREATEST(0, initial_stock_val - reserved_count - sold_count);

END;

$$ LANGUAGE plpgsql;


-- Fonction pour calculer la capacité restante d'un créneau
CREATE OR REPLACE FUNCTION get_slot_remaining_capacity(slot_uuid uuid)
RETURNS integer AS $$
DECLARE
  total_capacity integer;

  reserved_count integer;

  sold_count integer;

BEGIN
  -- Récupérer la capacité totale
  SELECT capacity INTO total_capacity
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

  
  -- Retourner la capacité disponible
  RETURN GREATEST(0, total_capacity - reserved_count - sold_count);

END;

$$ LANGUAGE plpgsql;


-- Fonction pour nettoyer les articles expirés du panier
CREATE OR REPLACE FUNCTION cleanup_expired_cart_items()
RETURNS void AS $$
BEGIN
  DELETE FROM cart_items
  WHERE reserved_until <= now();

END;

$$ LANGUAGE plpgsql;


-- DONNÉES INITIALES

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
  '2025-01-15 08:00:00+00',
  '2025-03-14 23:59:59+00',
  'published',
  'Conditions Générales de Vente

### Article 1 - Objet
Les présentes conditions générales de vente régissent la vente de billets pour l''événement "Les Défis Lontan".

### Article 2 - Prix
Les prix sont indiqués en euros TTC. Le paiement s''effectue en ligne de manière sécurisée.

### Article 3 - Annulation
Aucun remboursement ne sera effectué sauf en cas d''annulation de l''événement par l''organisateur.

### Article 4 - Responsabilité
L''organisateur décline toute responsabilité en cas d''accident lors de l''événement.',
  'Questions Fréquemment Posées

### Informations Générales

**Q : "Où se déroule l''événement ?"**
**R : "L''événement a lieu au Parc des Palmistes à Saint-Benoit, Réunion."**

**Q : "À quelle heure commence l''événement ?"**
**R : "L''événement débute à 9h00 et se termine à 17h00."**

**Q : "Y a-t-il un parking disponible ?"**
**R : "Oui, un parking gratuit est disponible sur place."**

### Billets et Réservations

**Q : "Puis-je modifier ma réservation ?"**
**R : "Les modifications ne sont pas possibles une fois la réservation confirmée."**

**Q : "Comment recevoir mes billets ?"**
**R : "Vos billets vous seront envoyés par e-mail après confirmation du paiement."**

**Q : "Que faire si je perds mes billets ?"**
**R : "Utilisez la fonction ''Retrouver mon billet'' sur notre site avec votre adresse e-mail."**

### Activités

**Q : "À partir de quel âge peut-on faire du poney ?"**
**R : "L''activité poney est accessible dès 3 ans, avec accompagnement obligatoire pour les moins de 8 ans."**

**Q : "Le tir à l''arc est-il sécurisé ?"**
**R : "Oui, l''activité est encadrée par des moniteurs diplômés avec tout l''équipement de sécurité."**',
  'Venez vivre une journée exceptionnelle au cœur de la nature réunionnaise ! 

🏇 **Activités Poney** : Découverte et balade pour tous les âges
🏹 **Tir à l''Arc** : Initiation et perfectionnement avec des moniteurs diplômés
🌿 **Cadre naturel** : Au Parc des Palmistes, un écrin de verdure unique

**Horaires :** 9h00 - 17h00
**Lieu :** Parc des Palmistes, Saint-Benoit
**Parking gratuit** sur place

Une expérience familiale inoubliable dans un cadre exceptionnel !'
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
(
  '660e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  'Pass Marmaille (3-12 ans)',
  15.00,
  'Pass spécialement conçu pour les enfants de 3 à 12 ans. Inclut une activité au choix (poney ou tir à l''arc) avec encadrement adapté à l''âge.',
  50
),
(
  '660e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440000',
  'Pass Tangue (13-17 ans)',
  20.00,
  'Pass pour les adolescents de 13 à 17 ans. Activité au choix avec un niveau d''encadrement adapté aux ados.',
  30
),
(
  '660e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440000',
  'Pass Papangue (18+ ans)',
  25.00,
  'Pass adulte pour les 18 ans et plus. Activité au choix avec encadrement professionnel.',
  40
),
(
  '660e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440000',
  'Pass Famille (2 adultes + 2 enfants)',
  65.00,
  'Pass famille économique pour 2 adultes et 2 enfants. Chaque membre peut choisir son activité selon son âge.',
  20
),
(
  '660e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440000',
  'Pass Découverte (Accès libre)',
  8.00,
  'Accès libre au parc sans activité spécifique. Parfait pour profiter du cadre naturel et des espaces de pique-nique.',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  initial_stock = EXCLUDED.initial_stock;


-- Insérer les créneaux horaires pour les activités
INSERT INTO time_slots (id, event_id, activity, slot_time, capacity) VALUES
-- Créneaux Poney (matin)
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 09:00:00+00', 8),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 09:30:00+00', 8),
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 10:00:00+00', 8),
('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 10:30:00+00', 8),
('770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 11:00:00+00', 8),
('770e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 11:30:00+00', 8),

-- Créneaux Poney (après-midi)
('770e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 14:00:00+00', 8),
('770e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 14:30:00+00', 8),
('770e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 15:00:00+00', 8),
('770e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 15:30:00+00', 8),
('770e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'poney', '2025-03-15 16:00:00+00', 8),

-- Créneaux Tir à l'Arc (matin)
('770e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 09:00:00+00', 12),
('770e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 09:45:00+00', 12),
('770e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 10:30:00+00', 12),
('770e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 11:15:00+00', 12),

-- Créneaux Tir à l'Arc (après-midi)
('770e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 14:00:00+00', 12),
('770e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 14:45:00+00', 12),
('770e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 15:30:00+00', 12),
('770e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440000', 'tir_arc', '2025-03-15 16:15:00+00', 12)
ON CONFLICT (id) DO UPDATE SET
  activity = EXCLUDED.activity,
  slot_time = EXCLUDED.slot_time,
  capacity = EXCLUDED.capacity;


-- Insérer les ressources poney pour l'événement
INSERT INTO pony_resources (id, event_id, initial_stock) VALUES
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 12)
ON CONFLICT (id) DO UPDATE SET
  initial_stock = EXCLUDED.initial_stock;


-- Insérer un utilisateur admin par défaut
INSERT INTO users (id, email, role) VALUES
('990e8400-e29b-41d4-a716-446655440001', 'admin@billetevent.com', 'admin')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role;
;

