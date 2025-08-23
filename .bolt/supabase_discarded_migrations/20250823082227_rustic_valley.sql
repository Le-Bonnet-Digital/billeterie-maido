-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the 'events' table
CREATE TABLE IF NOT EXISTS public.events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    event_date date NOT NULL,
    sales_opening_date timestamp with time zone NOT NULL,
    sales_closing_date timestamp with time zone NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'finished', 'cancelled')),
    cgv_content text DEFAULT '',
    faq_content text DEFAULT '',
    key_info_content text DEFAULT '',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for 'events' table
CREATE INDEX IF NOT EXISTS idx_events_dates ON public.events (event_date, sales_opening_date, sales_closing_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events (status);

-- RLS for 'events' table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Admins can manage events" ON public.events
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP POLICY IF EXISTS "Anyone can view published events" ON public.events;
CREATE POLICY "Anyone can view published events" ON public.events
FOR SELECT USING (status = 'published');

-- Create the 'passes' table
CREATE TABLE IF NOT EXISTS public.passes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    description text DEFAULT '',
    initial_stock integer, -- NULL means unlimited stock
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes for 'passes' table
CREATE INDEX IF NOT EXISTS idx_passes_event ON public.passes (event_id);

-- RLS for 'passes' table
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage passes" ON public.passes;
CREATE POLICY "Admins can manage passes" ON public.passes
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP POLICY IF EXISTS "Anyone can view passes for published events" ON public.passes;
CREATE POLICY "Anyone can view passes for published events" ON public.passes
FOR SELECT USING (EXISTS (SELECT 1 FROM events e WHERE e.id = passes.event_id AND e.status = 'published'));

-- Create the 'time_slots' table
CREATE TABLE IF NOT EXISTS public.time_slots (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    activity text NOT NULL CHECK (activity IN ('poney', 'tir_arc')),
    slot_time timestamp with time zone NOT NULL,
    capacity integer NOT NULL DEFAULT 15,
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes for 'time_slots' table
CREATE INDEX IF NOT EXISTS idx_time_slots_event ON public.time_slots (event_id, activity);

-- RLS for 'time_slots' table
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage time slots" ON public.time_slots;
CREATE POLICY "Admins can manage time slots" ON public.time_slots
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP POLICY IF EXISTS "Anyone can view time slots for published events" ON public.time_slots;
CREATE POLICY "Anyone can view time slots for published events" ON public.time_slots
FOR SELECT USING (EXISTS (SELECT 1 FROM events e WHERE e.id = time_slots.event_id AND e.status = 'published'));

-- Create the 'pony_resources' table
CREATE TABLE IF NOT EXISTS public.pony_resources (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    initial_stock integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS for 'pony_resources' table
ALTER TABLE public.pony_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage pony resources" ON public.pony_resources;
CREATE POLICY "Admins can manage pony resources" ON public.pony_resources
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Create the 'users' table (for authentication and roles)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT auth.uid(),
    email text NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'pony_provider', 'archery_provider', 'client')),
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes for 'users' table
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users (email);

-- RLS for 'users' table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
FOR SELECT USING (id = auth.uid());

-- Create the 'reservations' table
CREATE TABLE IF NOT EXISTS public.reservations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_number text UNIQUE NOT NULL,
    client_email text NOT NULL,
    pass_id uuid REFERENCES public.passes(id),
    time_slot_id uuid REFERENCES public.time_slots(id),
    payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes for 'reservations' table
CREATE INDEX IF NOT EXISTS idx_reservations_email ON public.reservations (client_email);
CREATE UNIQUE INDEX IF NOT EXISTS reservations_reservation_number_key ON public.reservations (reservation_number);

-- RLS for 'reservations' table
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all reservations" ON public.reservations;
CREATE POLICY "Admins can manage all reservations" ON public.reservations
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP POLICY IF EXISTS "Users can view reservations by email" ON public.reservations;
CREATE POLICY "Users can view reservations by email" ON public.reservations
FOR SELECT USING (true); -- This policy allows anyone to view reservations by email, which is needed for the "Find Ticket" feature. Consider refining this for production.

-- Function to generate reservation number
CREATE OR REPLACE FUNCTION set_reservation_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.reservation_number := 'RES-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set reservation number before insert
DROP TRIGGER IF EXISTS trigger_set_reservation_number ON public.reservations;
CREATE TRIGGER trigger_set_reservation_number
BEFORE INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION set_reservation_number();

-- Create the 'cart_items' table
CREATE TABLE IF NOT EXISTS public.cart_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id text NOT NULL,
    pass_id uuid REFERENCES public.passes(id),
    time_slot_id uuid REFERENCES public.time_slots(id),
    quantity integer NOT NULL DEFAULT 1,
    reserved_until timestamp with time zone NOT NULL DEFAULT (now() + interval '10 minutes'),
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes for 'cart_items' table
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON public.cart_items (session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_reserved_until ON public.cart_items (reserved_until);

-- RLS for 'cart_items' table
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can manage their cart items" ON public.cart_items;
CREATE POLICY "Anyone can manage their cart items" ON public.cart_items
FOR ALL USING (true); -- This policy allows anyone to manage cart items, as it's session-based.

-- RPC function to get remaining pass stock
CREATE OR REPLACE FUNCTION get_pass_remaining_stock(pass_uuid uuid)
RETURNS integer AS $$
DECLARE
    initial_stock integer;
    reserved_count integer;
BEGIN
    SELECT p.initial_stock INTO initial_stock
    FROM passes p
    WHERE p.id = pass_uuid;

    IF initial_stock IS NULL THEN
        RETURN 999999; -- Unlimited stock
    END IF;

    SELECT COALESCE(SUM(ci.quantity), 0) INTO reserved_count
    FROM cart_items ci
    WHERE ci.pass_id = pass_uuid
      AND ci.reserved_until > now();

    RETURN initial_stock - reserved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to get remaining slot capacity
CREATE OR REPLACE FUNCTION get_slot_remaining_capacity(slot_uuid uuid)
RETURNS integer AS $$
DECLARE
    slot_capacity integer;
    reserved_count integer;
BEGIN
    SELECT ts.capacity INTO slot_capacity
    FROM time_slots ts
    WHERE ts.id = slot_uuid;

    SELECT COALESCE(SUM(ci.quantity), 0) INTO reserved_count
    FROM cart_items ci
    WHERE ci.time_slot_id = slot_uuid
      AND ci.reserved_until > now();

    RETURN slot_capacity - reserved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to clean up expired cart items
CREATE OR REPLACE FUNCTION cleanup_expired_cart_items()
RETURNS void AS $$
BEGIN
    DELETE FROM cart_items
    WHERE reserved_until <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initial Data for "Les Défis Lontan - 30 Août"
DO $$
DECLARE
    event_id_defis_lontan uuid;
    pass_marmaille_id uuid;
    pass_papangue_id uuid;
    pass_tangue_id uuid;
    pass_luge_id uuid;
    pony_resource_id uuid;
    event_date_val date := '2025-08-30';
    sales_opening_date_val timestamp with time zone := now();
    sales_closing_date_val timestamp with time zone := '2025-08-29 23:59:00+00';
    cgv_content_val text := '
Conditions Générales de Vente – Journées d''Animation ''Les Défis Lontan''

Article 1 : Objet
Les présentes Conditions Générales de Vente (CGV) régissent la vente de billets pour les journées d''animation ''Les Défis Lontan'' organisées par [Nom de l''Organisateur]. L''achat de billets implique l''acceptation sans réserve des présentes CGV.

Article 2 : Billets et Pass
2.1 Types de Pass : Plusieurs types de pass sont disponibles, chacun donnant accès à des activités spécifiques (luge, poney, tir à l''arc) et pouvant être soumis à des conditions d''âge, de poids ou de taille. Les détails de chaque pass sont précisés sur la page de vente.
2.2 Validité : Chaque billet est valable uniquement pour la date et, le cas échéant, le créneau horaire spécifiés lors de l''achat.
2.3 Stock : Le nombre de pass et de places pour les créneaux horaires est limité. La vente est clôturée dès l''atteinte du stock maximal ou à la date de fin des ventes.

Article 3 : Tarifs et Paiement
3.1 Prix : Les prix des pass sont indiqués en euros (€) toutes taxes comprises.
3.2 Paiement : Le paiement s''effectue exclusivement en ligne via la plateforme sécurisée Stripe. La réservation n''est confirmée qu''après validation du paiement.

Article 4 : Réservation des Créneaux Horaires (Poney et Tir à l''Arc)
4.1 Obligation de Réservation : Pour les activités Poney et Tir à l''Arc, la réservation d''un créneau horaire spécifique est obligatoire au moment de l''achat du pass.
4.2 Non Modifiable : Une fois le créneau horaire choisi et la réservation confirmée, il n''est pas possible de le modifier.
4.3 Présentation : Il est impératif de se présenter à l''heure exacte de votre créneau. Tout retard pourra entraîner la perte de votre place sans possibilité de remboursement ou de report.

Article 5 : Garantie Météo
L''événement a lieu en plein air. En cas de conditions météorologiques défavorables (pluie intense, vent fort) rendant l''activité luge impraticable ou dangereuse, et si l''activité luge est ouverte moins de 2 heures sur la journée, un coupon pour 2 tours de luge gratuits, valable 1 an, sera remis aux participants concernés. Cette garantie ne s''applique pas aux autres activités.

Article 6 : Annulation et Remboursement
6.1 Annulation par le Client : Les billets ne sont ni échangeables, ni remboursables, sauf en cas d''annulation de l''événement par l''organisateur.
6.2 Annulation par l''Organisateur : En cas d''annulation totale de l''événement par l''organisateur (hors cas de force majeure), les billets seront intégralement remboursés. L''organisateur s''engage à informer les participants dans les meilleurs délais.
6.3 Force Majeure : L''organisateur ne pourra être tenu responsable en cas d''inexécution ou de retard dans l''exécution de ses obligations due à un cas de force majeure (catastrophe naturelle, grève, décision administrative, etc.). Dans ces cas, aucun remboursement ne sera effectué.

Article 7 : Sécurité et Responsabilité
7.1 Consignes de Sécurité : Les participants s''engagent à respecter scrupuleusement les consignes de sécurité et les instructions du personnel encadrant.
7.2 Responsabilité : L''organisateur décline toute responsabilité en cas de vol, perte ou dommage des biens personnels des participants. La participation aux activités se fait sous l''entière responsabilité des participants.

Article 8 : Données Personnelles
Les informations collectées lors de l''achat sont nécessaires à la gestion de votre réservation. Conformément au RGPD, vous disposez d''un droit d''accès, de rectification et de suppression de vos données.

Article 9 : Litiges
Les présentes CGV sont soumises au droit français. Tout litige relatif à la vente de billets sera de la compétence exclusive des tribunaux compétents.
';
    faq_content_val text := '
### Foire Aux Questions

Q : "Que se passe-t-il en cas de pluie ?"
R : "L''événement a lieu en plein air et la météo en montagne peut être changeante. En cas de pluie intense, certaines activités peuvent être temporairement suspendues pour votre sécurité. Notre Garantie Météo vous assure que si l''activité luge est ouverte moins de 2 heures sur la journée, vous recevrez un coupon pour 2 tours de luge gratuits, valable 1 an."

Q : "Dois-je réserver à l''avance ?"
R : "Oui, l''achat des billets se fait exclusivement en ligne et à l''avance. Les places pour le poney et le tir à l''arc sont limitées et partent très vite, nous vous conseillons de réserver le plus tôt possible pour garantir votre créneau."

Q : "Puis-je changer mon créneau horaire ?"
R : "Non, malheureusement, une fois votre créneau pour le poney ou le tir à l''arc réservé, il n''est pas possible de le modifier. Nous vous demandons de bien vérifier vos disponibilités avant de finaliser votre achat."

Q : "Les animations ''jeux lontan'' sont-elles payantes ?"
R : "Non, les animations sont un bonus gratuit offert à tous les visiteurs du parc ! L''inscription se fait directement sur place le jour même, au stand d''accueil. Attention, les places sont limitées et attribuées selon le principe du ''premier arrivé, premier servi''."
';
    key_info_content_val text := 'Événement en plein air : la météo en montagne peut changer rapidement. Notre Garantie Météo : si la luge est ouverte moins de 2h, nous vous offrons 2 tours gratuits valables 1 an. Conseil : venez dès 8h30 pour maximiser votre journée ! Animations ''jeux lontan'' gratuites, inscription sur place (places limitées).';
BEGIN
    -- Insert the event
    INSERT INTO public.events (name, event_date, sales_opening_date, sales_closing_date, status, cgv_content, faq_content, key_info_content)
    VALUES (
        'Les Défis Lontan - 30 Août',
        event_date_val,
        sales_opening_date_val,
        sales_closing_date_val,
        'published',
        cgv_content_val,
        faq_content_val,
        key_info_content_val
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        event_date = EXCLUDED.event_date,
        sales_opening_date = EXCLUDED.sales_opening_date,
        sales_closing_date = EXCLUDED.sales_closing_date,
        status = EXCLUDED.status,
        cgv_content = EXCLUDED.cgv_content,
        faq_content = EXCLUDED.faq_content,
        key_info_content = EXCLUDED.key_info_content,
        updated_at = now()
    RETURNING id INTO event_id_defis_lontan;

    -- Insert passes for the event
    INSERT INTO public.passes (event_id, name, price, description, initial_stock)
    VALUES
        (event_id_defis_lontan, 'Le tour des marmaille', 7.00, 'Pour les enfants de 2 ans jusqu''à 40 kg. Inclus : Luge en illimité + 1 tour de poney.', 110)
        ON CONFLICT (id) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            description = EXCLUDED.description,
            initial_stock = EXCLUDED.initial_stock
        RETURNING id INTO pass_marmaille_id,
        (event_id_defis_lontan, 'La Flèche du Papangue', 8.00, 'Pour toute personne à partir de 8 ans. Inclus : Luge en illimité + 1 session de Tir à l''Arc (avec participation au challenge de la journée).', 308)
        ON CONFLICT (id) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            description = EXCLUDED.description,
            initial_stock = EXCLUDED.initial_stock
        RETURNING id INTO pass_papangue_id,
        (event_id_defis_lontan, 'Le pas du tangue', 2.00, 'Pour les enfants de 9 mois et demi à 23 mois. Inclus : 1 tour de poney.', 20)
        ON CONFLICT (id) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            description = EXCLUDED.description,
            initial_stock = EXCLUDED.initial_stock
        RETURNING id INTO pass_tangue_id,
        (event_id_defis_lontan, 'Luge Seule', 6.00, 'Pour tous. Inclus : Luge en illimité.', NULL)
        ON CONFLICT (id) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            description = EXCLUDED.description,
            initial_stock = EXCLUDED.initial_stock
        RETURNING id INTO pass_luge_id;

    -- Insert pony resource
    INSERT INTO public.pony_resources (event_id, initial_stock)
    VALUES (event_id_defis_lontan, 130)
    ON CONFLICT (id) DO UPDATE SET
        event_id = EXCLUDED.event_id,
        initial_stock = EXCLUDED.initial_stock
    RETURNING id INTO pony_resource_id;

    -- Generate time slots for Poney and Tir à l'Arc for 2025-08-30
    -- Poney: 9h00 to 12h00, 14h00 to 17h00, every 20 minutes, capacity 15
    FOR i IN 0..((12-9)*3 + (17-14)*3 -1) LOOP -- 3 slots per hour
        INSERT INTO public.time_slots (event_id, activity, slot_time, capacity)
        VALUES (
            event_id_defis_lontan,
            'poney',
            event_date_val + (INTERVAL '9 hours') + (i * INTERVAL '20 minutes'),
            15
        )
        ON CONFLICT (id) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            activity = EXCLUDED.activity,
            slot_time = EXCLUDED.slot_time,
            capacity = EXCLUDED.capacity;
    END LOOP;

    FOR i IN 0..((17-14)*3 -1) LOOP
        INSERT INTO public.time_slots (event_id, activity, slot_time, capacity)
        VALUES (
            event_id_defis_lontan,
            'poney',
            event_date_val + (INTERVAL '14 hours') + (i * INTERVAL '20 minutes'),
            15
        )
        ON CONFLICT (id) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            activity = EXCLUDED.activity,
            slot_time = EXCLUDED.slot_time,
            capacity = EXCLUDED.capacity;
    END LOOP;

    -- Tir à l'Arc: 9h00 to 12h00, 14h00 to 17h00, every 20 minutes, capacity 15
    FOR i IN 0..((12-9)*3 -1) LOOP
        INSERT INTO public.time_slots (event_id, activity, slot_time, capacity)
        VALUES (
            event_id_defis_lontan,
            'tir_arc',
            event_date_val + (INTERVAL '9 hours') + (i * INTERVAL '20 minutes'),
            15
        )
        ON CONFLICT (id) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            activity = EXCLUDED.activity,
            slot_time = EXCLUDED.slot_time,
            capacity = EXCLUDED.capacity;
    END LOOP;

    FOR i IN 0..((17-14)*3 -1) LOOP
        INSERT INTO public.time_slots (event_id, activity, slot_time, capacity)
        VALUES (
            event_id_defis_lontan,
            'tir_arc',
            event_date_val + (INTERVAL '14 hours') + (i * INTERVAL '20 minutes'),
            15
        )
        ON CONFLICT (id) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            activity = EXCLUDED.activity,
            slot_time = EXCLUDED.slot_time,
            capacity = EXCLUDED.capacity;
    END LOOP;

END $$;