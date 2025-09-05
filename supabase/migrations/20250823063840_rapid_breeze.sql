

-- Extension pour les UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- Table des événements
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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


-- Table des pass/billets
CREATE TABLE IF NOT EXISTS passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price decimal(10,2) NOT NULL,
  description text DEFAULT '',
  initial_stock integer,
  created_at timestamptz DEFAULT now()
);


-- Table des créneaux horaires
CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  activity text NOT NULL CHECK (activity IN ('poney', 'tir_arc')),
  slot_time timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 15,
  created_at timestamptz DEFAULT now()
);


-- Table des ressources poney
CREATE TABLE IF NOT EXISTS pony_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  initial_stock integer NOT NULL,
  created_at timestamptz DEFAULT now()
);


-- Table des utilisateurs avec rôles
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'pony_provider', 'archery_provider', 'client')),
  created_at timestamptz DEFAULT now()
);


-- Table des réservations
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number text UNIQUE NOT NULL,
  client_email text NOT NULL,
  pass_id uuid REFERENCES passes(id),
  time_slot_id uuid REFERENCES time_slots(id),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
  created_at timestamptz DEFAULT now()
);


-- Table des articles du panier (réservation temporaire)
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  pass_id uuid REFERENCES passes(id),
  time_slot_id uuid REFERENCES time_slots(id),
  quantity integer NOT NULL DEFAULT 1,
  reserved_until timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now()
);


-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

CREATE INDEX IF NOT EXISTS idx_events_dates ON events(event_date, sales_opening_date, sales_closing_date);

CREATE INDEX IF NOT EXISTS idx_passes_event ON passes(event_id);

CREATE INDEX IF NOT EXISTS idx_time_slots_event ON time_slots(event_id, activity);

CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(client_email);

CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items(session_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_reserved_until ON cart_items(reserved_until);


-- Fonction pour générer un numéro de réservation
CREATE OR REPLACE FUNCTION generate_reservation_number()
RETURNS text AS $$
BEGIN
  RETURN 'RES' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 10000)::text, 4, '0');

END;

$$ LANGUAGE plpgsql;


-- Trigger pour auto-générer le numéro de réservation
CREATE OR REPLACE FUNCTION set_reservation_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.reservation_number IS NULL OR NEW.reservation_number = '' THEN
    NEW.reservation_number := generate_reservation_number();

  END IF;

  RETURN NEW;

END;

$$ LANGUAGE plpgsql;


CREATE TRIGGER trigger_set_reservation_number
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_reservation_number();


-- Fonction pour nettoyer les articles expirés du panier
CREATE OR REPLACE FUNCTION cleanup_expired_cart_items()
RETURNS void AS $$
BEGIN
  DELETE FROM cart_items WHERE reserved_until < now();

END;

$$ LANGUAGE plpgsql;


-- Fonction pour calculer le stock restant d'un pass
CREATE OR REPLACE FUNCTION get_pass_remaining_stock(pass_uuid uuid)
RETURNS integer AS $$
DECLARE
  initial_stock integer;

  reserved_count integer;

  sold_count integer;

BEGIN
  -- Récupérer le stock initial
  SELECT p.initial_stock INTO initial_stock
  FROM passes p WHERE p.id = pass_uuid;

  
  -- Si stock illimité (NULL), retourner un grand nombre
  IF initial_stock IS NULL THEN
    RETURN 999999;

  END IF;

  
  -- Compter les réservations vendues
  SELECT COUNT(*) INTO sold_count
  FROM reservations r 
  WHERE r.pass_id = pass_uuid AND r.payment_status = 'paid';

  
  -- Compter les articles dans le panier (non expirés)
  SELECT COUNT(*) INTO reserved_count
  FROM cart_items c 
  WHERE c.pass_id = pass_uuid AND c.reserved_until > now();

  
  RETURN initial_stock - COALESCE(sold_count, 0) - COALESCE(reserved_count, 0);

END;

$$ LANGUAGE plpgsql;


-- Fonction pour calculer les places restantes d'un créneau
CREATE OR REPLACE FUNCTION get_slot_remaining_capacity(slot_uuid uuid)
RETURNS integer AS $$
DECLARE
  total_capacity integer;

  reserved_count integer;

  sold_count integer;

BEGIN
  -- Récupérer la capacité totale
  SELECT ts.capacity INTO total_capacity
  FROM time_slots ts WHERE ts.id = slot_uuid;

  
  -- Compter les réservations vendues
  SELECT COUNT(*) INTO sold_count
  FROM reservations r 
  WHERE r.time_slot_id = slot_uuid AND r.payment_status = 'paid';

  
  -- Compter les articles dans le panier (non expirés)
  SELECT COUNT(*) INTO reserved_count
  FROM cart_items c 
  WHERE c.time_slot_id = slot_uuid AND c.reserved_until > now();

  
  RETURN total_capacity - COALESCE(sold_count, 0) - COALESCE(reserved_count, 0);

END;

$$ LANGUAGE plpgsql;


-- Enable RLS sur toutes les tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

ALTER TABLE passes ENABLE ROW LEVEL SECURITY;

ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

ALTER TABLE pony_resources ENABLE ROW LEVEL SECURITY;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;


-- Politiques pour les événements (lecture publique pour événements publiés)
CREATE POLICY "Anyone can view published events" ON events
  FOR SELECT USING (status = 'published');


CREATE POLICY "Admins can manage events" ON events
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));


-- Politiques pour les pass (lecture publique)
CREATE POLICY "Anyone can view passes for published events" ON passes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = passes.event_id AND e.status = 'published'
    )
  );


CREATE POLICY "Admins can manage passes" ON passes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));


-- Politiques pour les créneaux (lecture publique)
CREATE POLICY "Anyone can view time slots for published events" ON time_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = time_slots.event_id AND e.status = 'published'
    )
  );


CREATE POLICY "Admins can manage time slots" ON time_slots
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));


-- Politiques pour les ressources poney
CREATE POLICY "Admins can manage pony resources" ON pony_resources
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));


-- Politiques pour les utilisateurs
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (id = auth.uid());


CREATE POLICY "Admins can view all users" ON users
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));


-- Politiques pour les réservations
CREATE POLICY "Users can view reservations by email" ON reservations
  FOR SELECT USING (true);
 -- Contrôlé au niveau application

CREATE POLICY "Admins can manage all reservations" ON reservations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));


-- Politiques pour le panier (session-based)
CREATE POLICY "Anyone can manage their cart items" ON cart_items
  FOR ALL USING (true);
 -- Contrôlé au niveau application par session_id;

