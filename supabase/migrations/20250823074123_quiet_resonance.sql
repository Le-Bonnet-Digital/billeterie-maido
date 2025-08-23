/*
  # Complete Database Setup for Event Ticketing System
  
  INSTRUCTIONS:
  1. Go to your Supabase project dashboard
  2. Navigate to SQL Editor
  3. Copy and paste this entire script
  4. Click "Run" to execute
  
  This will create all necessary tables, functions, and initial data.
*/

-- Extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: events
CREATE TABLE IF NOT EXISTS events (
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

-- Table: passes
CREATE TABLE IF NOT EXISTS passes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price decimal(10,2) NOT NULL,
  description text DEFAULT '',
  initial_stock integer,
  created_at timestamptz DEFAULT now()
);

-- Table: time_slots
CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  activity text NOT NULL CHECK (activity IN ('poney', 'tir_arc')),
  slot_time timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 15,
  created_at timestamptz DEFAULT now()
);

-- Table: pony_resources
CREATE TABLE IF NOT EXISTS pony_resources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  initial_stock integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'pony_provider', 'archery_provider', 'client')),
  created_at timestamptz DEFAULT now()
);

-- Table: reservations
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_number text UNIQUE NOT NULL,
  client_email text NOT NULL,
  pass_id uuid REFERENCES passes(id),
  time_slot_id uuid REFERENCES time_slots(id),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
  created_at timestamptz DEFAULT now()
);

-- Table: cart_items
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id text NOT NULL,
  pass_id uuid REFERENCES passes(id),
  time_slot_id uuid REFERENCES time_slots(id),
  quantity integer NOT NULL DEFAULT 1,
  reserved_until timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(event_date, sales_opening_date, sales_closing_date);
CREATE INDEX IF NOT EXISTS idx_passes_event ON passes(event_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_event ON time_slots(event_id, activity);
CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(client_email);
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_reserved_until ON cart_items(reserved_until);

-- Function: generate reservation number
CREATE OR REPLACE FUNCTION generate_reservation_number()
RETURNS text AS $$
BEGIN
  RETURN 'RES' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 10000)::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-generate reservation number
CREATE OR REPLACE FUNCTION set_reservation_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.reservation_number IS NULL OR NEW.reservation_number = '' THEN
    NEW.reservation_number := generate_reservation_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_reservation_number ON reservations;
CREATE TRIGGER trigger_set_reservation_number
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_reservation_number();

-- Function: cleanup expired cart items
CREATE OR REPLACE FUNCTION cleanup_expired_cart_items()
RETURNS void AS $$
BEGIN
  DELETE FROM cart_items WHERE reserved_until < now();
END;
$$ LANGUAGE plpgsql;

-- Function: get pass remaining stock
CREATE OR REPLACE FUNCTION get_pass_remaining_stock(pass_uuid uuid)
RETURNS integer AS $$
DECLARE
  initial_stock integer;
  reserved_count integer;
  sold_count integer;
BEGIN
  SELECT p.initial_stock INTO initial_stock
  FROM passes p WHERE p.id = pass_uuid;
  
  IF initial_stock IS NULL THEN
    RETURN 999999;
  END IF;
  
  SELECT COUNT(*) INTO sold_count
  FROM reservations r 
  WHERE r.pass_id = pass_uuid AND r.payment_status = 'paid';
  
  SELECT COUNT(*) INTO reserved_count
  FROM cart_items c 
  WHERE c.pass_id = pass_uuid AND c.reserved_until > now();
  
  RETURN initial_stock - COALESCE(sold_count, 0) - COALESCE(reserved_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: get slot remaining capacity
CREATE OR REPLACE FUNCTION get_slot_remaining_capacity(slot_uuid uuid)
RETURNS integer AS $$
DECLARE
  total_capacity integer;
  reserved_count integer;
  sold_count integer;
BEGIN
  SELECT ts.capacity INTO total_capacity
  FROM time_slots ts WHERE ts.id = slot_uuid;
  
  SELECT COUNT(*) INTO sold_count
  FROM reservations r 
  WHERE r.time_slot_id = slot_uuid AND r.payment_status = 'paid';
  
  SELECT COUNT(*) INTO reserved_count
  FROM cart_items c 
  WHERE c.time_slot_id = slot_uuid AND c.reserved_until > now();
  
  RETURN total_capacity - COALESCE(sold_count, 0) - COALESCE(reserved_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pony_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
DROP POLICY IF EXISTS "Anyone can view published events" ON events;
CREATE POLICY "Anyone can view published events" ON events
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events" ON events
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for passes
DROP POLICY IF EXISTS "Anyone can view passes for published events" ON passes;
CREATE POLICY "Anyone can view passes for published events" ON passes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = passes.event_id AND e.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can manage passes" ON passes;
CREATE POLICY "Admins can manage passes" ON passes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for time_slots
DROP POLICY IF EXISTS "Anyone can view time slots for published events" ON time_slots;
CREATE POLICY "Anyone can view time slots for published events" ON time_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = time_slots.event_id AND e.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can manage time slots" ON time_slots;
CREATE POLICY "Admins can manage time slots" ON time_slots
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for pony_resources
DROP POLICY IF EXISTS "Admins can manage pony resources" ON pony_resources;
CREATE POLICY "Admins can manage pony resources" ON pony_resources
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for users
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for reservations
DROP POLICY IF EXISTS "Users can view reservations by email" ON reservations;
CREATE POLICY "Users can view reservations by email" ON reservations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage all reservations" ON reservations;
CREATE POLICY "Admins can manage all reservations" ON reservations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for cart_items
DROP POLICY IF EXISTS "Anyone can manage their cart items" ON cart_items;
CREATE POLICY "Anyone can manage their cart items" ON cart_items
  FOR ALL USING (true);

-- Insert initial event data: "Les Défis Lontan"
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
  'defis-lontan-2025',
  'Les Défis Lontan - 30 Août',
  '2025-08-30',
  now(),
  '2025-08-29 23:59:00+04',
  'published',
  E'# Conditions Générales de Vente – Journées d''Animation "Les Défis Lontan"\n\n## Article 1 : Objet\nLes présentes conditions générales de vente régissent l''achat de billets pour les journées d''animation "Les Défis Lontan".\n\n## Article 2 : Pass et Activités\n- **Le tour des marmaille** : Luge illimitée + 1 tour de poney (enfants 2 ans à 40kg)\n- **La Flèche du Papangue** : Luge illimitée + 1 session de Tir à l''Arc (8 ans et +)\n- **Le pas du tangue** : 1 tour de poney (enfants 9 mois et demi à 23 mois)\n- **Luge Seule** : Accès luge illimitée\n\n## Article 3 : Réservation des Créneaux\nLes activités poney et tir à l''arc nécessitent une réservation de créneau horaire. Une fois réservé, le créneau ne peut être modifié.\n\n## Article 4 : Garantie Météo\nEn cas d''ouverture de la luge moins de 2 heures sur la journée, un coupon pour 2 tours gratuits sera offert (valable 1 an).\n\n## Article 5 : Annulation\nAucun remboursement ne sera effectué sauf annulation de l''événement par l''organisateur.',
  E'### Foire Aux Questions\n\n**Q : Que se passe-t-il en cas de pluie ?**\n\nR : L''événement a lieu en plein air et la météo en montagne peut être changeante. En cas de pluie intense, certaines activités peuvent être temporairement suspendues pour votre sécurité. Notre Garantie Météo vous assure que si l''activité luge est ouverte moins de 2 heures sur la journée, vous recevrez un coupon pour 2 tours de luge gratuits, valable 1 an.\n\n**Q : Dois-je réserver à l''avance ?**\n\nR : Oui, l''achat des billets se fait exclusivement en ligne et à l''avance. Les places pour le poney et le tir à l''arc sont limitées et partent très vite, nous vous conseillons de réserver le plus tôt possible pour garantir votre créneau.\n\n**Q : Puis-je changer mon créneau horaire ?**\n\nR : Non, malheureusement, une fois votre créneau pour le poney ou le tir à l''arc réservé, il n''est pas possible de le modifier. Nous vous demandons de bien vérifier vos disponibilités avant de finaliser votre achat.\n\n**Q : Les animations "jeux lontan" sont-elles payantes ?**\n\nR : Non, les animations sont un bonus gratuit offert à tous les visiteurs du parc ! L''inscription se fait directement sur place le jour même, au stand d''accueil. Attention, les places sont limitées et attribuées selon le principe du "premier arrivé, premier servi".',
  'Événement en plein air : la météo en montagne peut changer rapidement. Notre Garantie Météo : si la luge est ouverte moins de 2h, nous vous offrons 2 tours gratuits valables 1 an. Conseil : venez dès 8h30 pour maximiser votre journée ! Animations "jeux lontan" gratuites, inscription sur place (places limitées).'
) ON CONFLICT (id) DO NOTHING;

-- Insert passes for the event
INSERT INTO passes (id, event_id, name, price, description, initial_stock) VALUES
(
  'pass-tour-marmaille',
  'defis-lontan-2025',
  'Le tour des marmaille',
  7.00,
  'Pour les enfants de 2 ans jusqu''à 40 kg. Inclus : Luge en illimité + 1 tour de poney.',
  110
),
(
  'pass-fleche-papangue', 
  'defis-lontan-2025',
  'La Flèche du Papangue',
  8.00,
  'Pour toute personne à partir de 8 ans. Inclus : Luge en illimité + 1 session de Tir à l''Arc (avec participation au challenge de la journée).',
  308
),
(
  'pass-pas-tangue',
  'defis-lontan-2025', 
  'Le pas du tangue',
  2.00,
  'Pour les enfants de 9 mois et demi à 23 mois. Inclus : 1 tour de poney.',
  20
),
(
  'pass-luge-seule',
  'defis-lontan-2025',
  'Luge Seule', 
  6.00,
  'Pour tous. Inclus : Luge en illimité.',
  NULL -- Unlimited stock
) ON CONFLICT (id) DO NOTHING;

-- Insert pony resources
INSERT INTO pony_resources (event_id, initial_stock) VALUES 
('defis-lontan-2025', 130) ON CONFLICT DO NOTHING;

-- Generate time slots for poney (8:30 to 18:00, 20-minute slots, capacity 1)
DO $$
DECLARE
    slot_time timestamptz;
    slot_end timestamptz := '2025-08-30 18:00:00+04';
BEGIN
    slot_time := '2025-08-30 08:30:00+04';
    
    WHILE slot_time <= slot_end LOOP
        INSERT INTO time_slots (event_id, activity, slot_time, capacity)
        VALUES ('defis-lontan-2025', 'poney', slot_time, 1)
        ON CONFLICT DO NOTHING;
        
        slot_time := slot_time + interval '20 minutes';
    END LOOP;
END $$;

-- Generate time slots for archery (8:30 to 18:00, 20-minute slots, capacity 15)
DO $$
DECLARE
    slot_time timestamptz;
    slot_end timestamptz := '2025-08-30 18:00:00+04';
BEGIN
    slot_time := '2025-08-30 08:30:00+04';
    
    WHILE slot_time <= slot_end LOOP
        INSERT INTO time_slots (event_id, activity, slot_time, capacity)
        VALUES ('defis-lontan-2025', 'tir_arc', slot_time, 15)
        ON CONFLICT DO NOTHING;
        
        slot_time := slot_time + interval '20 minutes';
    END LOOP;
END $$;

-- Success message
SELECT 'Database setup completed successfully! All tables, functions, and initial data have been created.' as status;