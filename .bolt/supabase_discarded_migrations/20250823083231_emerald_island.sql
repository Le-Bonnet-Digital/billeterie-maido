-- Drop existing tables and functions to ensure a clean slate
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.pony_resources CASCADE;
DROP TABLE IF EXISTS public.time_slots CASCADE;
DROP TABLE IF EXISTS public.passes CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP FUNCTION IF EXISTS public.set_reservation_number CASCADE;
DROP FUNCTION IF EXISTS public.get_pass_remaining_stock CASCADE;
DROP FUNCTION IF EXISTS public.get_slot_remaining_capacity CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_cart_items CASCADE;

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pony_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Create the users table first
CREATE TABLE public.users (
    id uuid DEFAULT auth.uid() PRIMARY KEY,
    email text NOT NULL UNIQUE,
    role text DEFAULT 'client'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Add check constraint for roles
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'pony_provider'::text, 'archery_provider'::text, 'client'::text])));

-- RLS policies for users table
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (auth.role() = 'admin');
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (id = auth.uid());


-- Create events table
CREATE TABLE public.events (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    event_date date NOT NULL,
    sales_opening_date timestamp with time zone NOT NULL,
    sales_closing_date timestamp with time zone NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    cgv_content text DEFAULT ''::text,
    faq_content text DEFAULT ''::text,
    key_info_content text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add check constraint for event status
ALTER TABLE public.events ADD CONSTRAINT events_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'finished'::text, 'cancelled'::text])));

-- Indexes for events table
CREATE INDEX idx_events_dates ON public.events USING btree (event_date, sales_opening_date, sales_closing_date);
CREATE INDEX idx_events_status ON public.events USING btree (status);

-- RLS policies for events table
CREATE POLICY "Admins can manage events" ON public.events
    FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Anyone can view published events" ON public.events
    FOR SELECT USING (status = 'published'::text);


-- Create passes table
CREATE TABLE public.passes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    description text DEFAULT ''::text,
    initial_stock integer,
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes for passes table
CREATE INDEX idx_passes_event ON public.passes USING btree (event_id);

-- RLS policies for passes table
CREATE POLICY "Admins can manage passes" ON public.passes
    FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Anyone can view passes for published events" ON public.passes
    FOR SELECT USING (EXISTS ( SELECT 1 FROM public.events e WHERE ((e.id = passes.event_id) AND (e.status = 'published'::text))));


-- Create time_slots table
CREATE TABLE public.time_slots (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    activity text NOT NULL,
    slot_time timestamp with time zone NOT NULL,
    capacity integer DEFAULT 15 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Add check constraint for activity type
ALTER TABLE public.time_slots ADD CONSTRAINT time_slots_activity_check CHECK ((activity = ANY (ARRAY['poney'::text, 'tir_arc'::text])));

-- Indexes for time_slots table
CREATE INDEX idx_time_slots_event ON public.time_slots USING btree (event_id, activity);

-- RLS policies for time_slots table
CREATE POLICY "Admins can manage time slots" ON public.time_slots
    FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Anyone can view time slots for published events" ON public.time_slots
    FOR SELECT USING (EXISTS ( SELECT 1 FROM public.events e WHERE ((e.id = time_slots.event_id) AND (e.status = 'published'::text))));


-- Create pony_resources table
CREATE TABLE public.pony_resources (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    initial_stock integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS policies for pony_resources table
CREATE POLICY "Admins can manage pony resources" ON public.pony_resources
    FOR ALL USING (auth.role() = 'admin');


-- Create reservations table
CREATE TABLE public.reservations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    reservation_number text NOT NULL UNIQUE,
    client_email text NOT NULL,
    pass_id uuid REFERENCES public.passes(id),
    time_slot_id uuid REFERENCES public.time_slots(id),
    payment_status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Add check constraint for payment status
ALTER TABLE public.reservations ADD CONSTRAINT reservations_payment_status_check CHECK ((payment_status = ANY (ARRAY['paid'::text, 'pending'::text, 'refunded'::text])));

-- Indexes for reservations table
CREATE INDEX idx_reservations_email ON public.reservations USING btree (client_email);

-- RLS policies for reservations table
CREATE POLICY "Admins can manage all reservations" ON public.reservations
    FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Users can view reservations by email" ON public.reservations
    FOR SELECT USING (true); -- This policy allows public to view reservations by email, consider refining


-- Create cart_items table
CREATE TABLE public.cart_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id text NOT NULL,
    pass_id uuid REFERENCES public.passes(id),
    time_slot_id uuid REFERENCES public.time_slots(id),
    quantity integer DEFAULT 1 NOT NULL,
    reserved_until timestamp with time zone DEFAULT (now() + '00:10:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes for cart_items table
CREATE INDEX idx_cart_items_session ON public.cart_items USING btree (session_id);
CREATE INDEX idx_cart_items_reserved_until ON public.cart_items USING btree (reserved_until);

-- RLS policies for cart_items table
CREATE POLICY "Anyone can manage their cart items" ON public.cart_items
    FOR ALL USING (true); -- This policy allows public to manage cart items, consider refining


-- Functions

-- Function to set reservation number
CREATE OR REPLACE FUNCTION public.set_reservation_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.reservation_number := 'RES-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reservation number
CREATE TRIGGER trigger_set_reservation_number
BEFORE INSERT ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.set_reservation_number();


-- Function to get remaining stock for a pass
CREATE OR REPLACE FUNCTION public.get_pass_remaining_stock(pass_uuid uuid)
RETURNS integer AS $$
DECLARE
    initial_stock integer;
    reserved_quantity integer;
BEGIN
    SELECT p.initial_stock INTO initial_stock
    FROM public.passes p
    WHERE p.id = pass_uuid;

    IF initial_stock IS NULL THEN
        RETURN 999999; -- Unlimited stock
    END IF;

    SELECT COALESCE(SUM(ci.quantity), 0) INTO reserved_quantity
    FROM public.cart_items ci
    WHERE ci.pass_id = pass_uuid
      AND ci.reserved_until > now();

    RETURN initial_stock - reserved_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to get remaining capacity for a time slot
CREATE OR REPLACE FUNCTION public.get_slot_remaining_capacity(slot_uuid uuid)
RETURNS integer AS $$
DECLARE
    slot_capacity integer;
    reserved_quantity integer;
BEGIN
    SELECT ts.capacity INTO slot_capacity
    FROM public.time_slots ts
    WHERE ts.id = slot_uuid;

    SELECT COALESCE(SUM(ci.quantity), 0) INTO reserved_quantity
    FROM public.cart_items ci
    WHERE ci.time_slot_id = slot_uuid
      AND ci.reserved_until > now();

    RETURN slot_capacity - reserved_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to clean up expired cart items
CREATE OR REPLACE FUNCTION public.cleanup_expired_cart_items()
RETURNS void AS $$
BEGIN
    DELETE FROM public.cart_items
    WHERE reserved_until <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Initial Data Insertion (Example Event: Les Défis Lontan)

INSERT INTO public.events (id, name, event_date, sales_opening_date, sales_closing_date, status, cgv_content, faq_content, key_info_content)
VALUES
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Les Défis Lontan', '2025-12-25', '2025-08-01 09:00:00+00', '2025-12-24 23:59:59+00', 'published',
    '### Conditions Générales de Vente pour Les Défis Lontan

**Article 1 : Objet**
Les présentes Conditions Générales de Vente (CGV) régissent la vente de billets pour l''événement "Les Défis Lontan" organisé par [Nom de l''Organisateur].

**Article 2 : Billets**
Les billets sont nominatifs et non remboursables, sauf annulation de l''événement.

**Article 3 : Tarifs**
Les prix sont indiqués en euros (€) toutes taxes comprises.

**Article 4 : Paiement**
Le paiement s''effectue en ligne via Stripe.

**Article 5 : Accès à l''événement**
La présentation du billet (imprimé ou sur smartphone) est obligatoire pour accéder à l''événement.

**Article 6 : Annulation / Report**
En cas d''annulation de l''événement, les billets seront remboursés. En cas de report, les billets restent valables ou peuvent être remboursés sur demande.

**Article 7 : Données personnelles**
Les données collectées sont utilisées uniquement pour la gestion de l''événement et ne sont pas partagées avec des tiers.

**Article 8 : Litiges**
Tout litige relatif à la vente de billets sera soumis aux tribunaux compétents.',
    '### Foire Aux Questions - Les Défis Lontan

Q : "Où se déroule l''événement ?"
R : "L''événement se tiendra au Parc des Sports de Saint-Pierre."

Q : "Quels sont les horaires ?"
R : "L''événement est ouvert de 9h00 à 18h00."

Q : "Puis-je venir avec des enfants ?"
R : "Oui, l''événement est familial. Des activités spécifiques sont prévues pour les enfants."

Q : "Y a-t-il de la restauration sur place ?"
R : "Oui, plusieurs stands de restauration seront disponibles, proposant des spécialités locales."

Q : "Les animaux sont-ils autorisés ?"
R : "Pour des raisons de sécurité, les animaux ne sont pas autorisés, à l''exception des chiens guides."

Q : "Comment puis-je récupérer mon billet ?"
R : "Votre billet vous sera envoyé par e-mail après confirmation de votre achat. Vous pouvez le présenter sur votre smartphone ou l''imprimer."

Q : "Que faire en cas de problème avec mon billet ?"
R : "Contactez notre support client à support@billetevent.com avec votre numéro de réservation."',
    'Venez découvrir "Les Défis Lontan", une journée exceptionnelle dédiée aux jeux et traditions de l''île de la Réunion ! Au programme : courses de sacs, tir à la corde, et bien d''autres défis pour petits et grands. Une immersion culturelle garantie avec des animations, de la musique et des saveurs locales. Ne manquez pas cet événement unique pour célébrer notre patrimoine !')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    event_date = EXCLUDED.event_date,
    sales_opening_date = EXCLUDED.sales_opening_date,
    sales_closing_date = EXCLUDED.sales_closing_date,
    status = EXCLUDED.status,
    cgv_content = EXCLUDED.cgv_content,
    faq_content = EXCLUDED.faq_content,
    key_info_content = EXCLUDED.key_info_content,
    updated_at = now();


INSERT INTO public.passes (id, event_id, name, price, description, initial_stock)
VALUES
    ('p1a2b3c4-d5e6-7890-1234-567890abcdef', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Pass Journée Adulte', 25.00, 'Accès complet à toutes les activités et spectacles de la journée.', 500),
    ('p2b3c4d5-e6f7-8901-2345-67890abcdef0', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Pass Journée Enfant (3-12 ans)', 15.00, 'Accès aux activités adaptées aux enfants et aux spectacles.', 300),
    ('p3c4d5e6-f7a8-9012-3456-7890abcdef01', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Pass Famille (2 adultes + 2 enfants)', 70.00, 'Profitez d''une journée inoubliable en famille à tarif réduit.', 100),
    ('p4d5e6f7-a8b9-0123-4567-890abcdef012', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Pass Atelier Poney', 10.00, 'Participation à un atelier d''initiation au poney (créneau à choisir).', 100),
    ('p5e6f7a8-b9c0-1234-5678-90abcdef0123', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Pass Atelier Tir à l''Arc', 10.00, 'Participation à un atelier d''initiation au tir à l''arc (créneau à choisir).', 100);
    
INSERT INTO public.time_slots (event_id, activity, slot_time, capacity)
VALUES
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'poney', '2025-12-25 09:30:00+00', 10),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'poney', '2025-12-25 10:30:00+00', 10),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'poney', '2025-12-25 11:30:00+00', 10),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'poney', '2025-12-25 14:00:00+00', 10),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'poney', '2025-12-25 15:00:00+00', 10),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'tir_arc', '2025-12-25 09:45:00+00', 12),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'tir_arc', '2025-12-25 10:45:00+00', 12),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'tir_arc', '2025-12-25 11:45:00+00', 12),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'tir_arc', '2025-12-25 14:15:00+00', 12),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'tir_arc', '2025-12-25 15:15:00+00', 12);
```