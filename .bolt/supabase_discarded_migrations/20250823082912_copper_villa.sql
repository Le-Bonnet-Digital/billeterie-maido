-- Supprimer les tables existantes si elles existent, en respectant les dépendances
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.passes CASCADE;
DROP TABLE IF EXISTS public.time_slots CASCADE;
DROP TABLE IF EXISTS public.pony_resources CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Supprimer les fonctions existantes si elles existent
DROP FUNCTION IF EXISTS public.get_pass_remaining_stock(pass_uuid uuid);
DROP FUNCTION IF EXISTS public.get_slot_remaining_capacity(slot_uuid uuid);
DROP FUNCTION IF EXISTS public.cleanup_expired_cart_items();
DROP FUNCTION IF EXISTS public.set_reservation_number();

-- Création de la table 'events'
CREATE TABLE public.events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    event_date date NOT NULL,
    sales_opening_date timestamp with time zone NOT NULL,
    sales_closing_date timestamp with time zone NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'finished', 'cancelled')),
    cgv_content text DEFAULT ''::text,
    faq_content text DEFAULT ''::text,
    key_info_content text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Index pour la table 'events'
CREATE INDEX idx_events_dates ON public.events (event_date, sales_opening_date, sales_closing_date);
CREATE INDEX idx_events_status ON public.events (status);

-- RLS pour la table 'events'
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage events" ON public.events
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Anyone can view published events" ON public.events
    FOR SELECT USING (status = 'published');

-- Création de la table 'passes'
CREATE TABLE public.passes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    description text DEFAULT ''::text,
    initial_stock integer, -- NULL pour stock illimité
    created_at timestamp with time zone DEFAULT now()
);

-- Index pour la table 'passes'
CREATE INDEX idx_passes_event ON public.passes (event_id);

-- RLS pour la table 'passes'
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage passes" ON public.passes
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Anyone can view passes for published events" ON public.passes
    FOR SELECT USING (EXISTS (SELECT 1 FROM events e WHERE e.id = passes.event_id AND e.status = 'published'));

-- Création de la table 'time_slots'
CREATE TABLE public.time_slots (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    activity text NOT NULL CHECK (activity IN ('poney', 'tir_arc')),
    slot_time timestamp with time zone NOT NULL,
    capacity integer NOT NULL DEFAULT 15,
    created_at timestamp with time zone DEFAULT now()
);

-- Index pour la table 'time_slots'
CREATE INDEX idx_time_slots_event ON public.time_slots (event_id, activity);

-- RLS pour la table 'time_slots'
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage time slots" ON public.time_slots
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Anyone can view time slots for published events" ON public.time_slots
    FOR SELECT USING (EXISTS (SELECT 1 FROM events e WHERE e.id = time_slots.event_id AND e.status = 'published'));

-- Création de la table 'pony_resources' (exemple de ressource spécifique)
CREATE TABLE public.pony_resources (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    initial_stock integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS pour la table 'pony_resources'
ALTER TABLE public.pony_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pony resources" ON public.pony_resources
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Création de la table 'users' (pour RLS)
CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT auth.uid(),
    email text UNIQUE NOT NULL,
    role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'pony_provider', 'archery_provider', 'client')),
    created_at timestamp with time zone DEFAULT now()
);

-- Index pour la table 'users'
CREATE UNIQUE INDEX users_email_key ON public.users (email);

-- RLS pour la table 'users'
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (id = auth.uid());

-- Création de la table 'reservations'
CREATE TABLE public.reservations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_number text UNIQUE NOT NULL,
    client_email text NOT NULL,
    pass_id uuid REFERENCES public.passes(id),
    time_slot_id uuid REFERENCES public.time_slots(id),
    payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
    created_at timestamp with time zone DEFAULT now()
);

-- Index pour la table 'reservations'
CREATE INDEX idx_reservations_email ON public.reservations (client_email);

-- RLS pour la table 'reservations'
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reservations" ON public.reservations
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Users can view reservations by email" ON public.reservations
    FOR SELECT USING (true); -- Policy will be refined later for specific user access

-- Fonction pour générer un numéro de réservation unique
CREATE OR REPLACE FUNCTION set_reservation_number()
RETURNS TRIGGER AS $$
DECLARE
    new_reservation_number TEXT;
    current_year TEXT;
    current_month TEXT;
    counter INT;
BEGIN
    current_year := TO_CHAR(NOW(), 'YYYY');
    current_month := TO_CHAR(NOW(), 'MM');

    -- Trouver le dernier compteur pour le mois et l'année en cours
    SELECT COALESCE(MAX(SUBSTRING(reservation_number FROM 10)::INT), 0)
    INTO counter
    FROM public.reservations
    WHERE SUBSTRING(reservation_number FROM 1 FOR 4) = current_year
      AND SUBSTRING(reservation_number FROM 6 FOR 2) = current_month;

    counter := counter + 1;
    new_reservation_number := current_year || '-' || current_month || '-' || LPAD(counter::TEXT, 4, '0');

    NEW.reservation_number := new_reservation_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer le numéro de réservation avant insertion
CREATE TRIGGER trigger_set_reservation_number
BEFORE INSERT ON public.reservations
FOR EACH ROW EXECUTE FUNCTION set_reservation_number();

-- Création de la table 'cart_items'
CREATE TABLE public.cart_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id text NOT NULL,
    pass_id uuid REFERENCES public.passes(id),
    time_slot_id uuid REFERENCES public.time_slots(id),
    quantity integer NOT NULL DEFAULT 1,
    reserved_until timestamp with time zone NOT NULL DEFAULT (now() + interval '10 minutes'),
    created_at timestamp with time zone DEFAULT now()
);

-- Index pour la table 'cart_items'
CREATE INDEX idx_cart_items_session ON public.cart_items (session_id);
CREATE INDEX idx_cart_items_reserved_until ON public.cart_items (reserved_until);

-- RLS pour la table 'cart_items'
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage their cart items" ON public.cart_items
    FOR ALL USING (true); -- Simplified for now, can be refined with session_id = current_session_id()

-- Fonctions RPC pour la gestion des stocks et capacités

-- Fonction pour obtenir le stock restant d'un pass
CREATE OR REPLACE FUNCTION public.get_pass_remaining_stock(pass_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    initial_stock_val integer;
    reserved_quantity integer;
BEGIN
    SELECT initial_stock INTO initial_stock_val FROM public.passes WHERE id = pass_uuid;

    IF initial_stock_val IS NULL THEN
        RETURN 999999; -- Stock illimité
    END IF;

    SELECT COALESCE(SUM(ci.quantity), 0)
    INTO reserved_quantity
    FROM public.cart_items ci
    WHERE ci.pass_id = pass_uuid
      AND ci.reserved_until > now();

    RETURN initial_stock_val - reserved_quantity;
END;
$$;

-- Fonction pour obtenir la capacité restante d'un créneau horaire
CREATE OR REPLACE FUNCTION public.get_slot_remaining_capacity(slot_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    capacity_val integer;
    reserved_quantity integer;
BEGIN
    SELECT capacity INTO capacity_val FROM public.time_slots WHERE id = slot_uuid;

    SELECT COALESCE(SUM(ci.quantity), 0)
    INTO reserved_quantity
    FROM public.cart_items ci
    WHERE ci.time_slot_id = slot_uuid
      AND ci.reserved_until > now();

    RETURN capacity_val - reserved_quantity;
END;
$$;

-- Fonction pour nettoyer les articles de panier expirés
CREATE OR REPLACE FUNCTION public.cleanup_expired_cart_items()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.cart_items
    WHERE reserved_until <= now();
END;
$$;

-- Insertion des données initiales pour l'événement "Les Défis Lontan"
INSERT INTO public.events (id, name, event_date, sales_opening_date, sales_closing_date, status, cgv_content, faq_content, key_info_content)
VALUES
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Les Défis Lontan', '2025-12-25', '2025-11-01 09:00:00+00', '2025-12-24 23:59:59+00', 'published',
    '### Conditions Générales de Vente (CGV)

**Article 1 : Objet**
Les présentes CGV régissent la vente de billets pour l''événement "Les Défis Lontan" organisé par BilletEvent.

**Article 2 : Réservation et Paiement**
Toute réservation est ferme et définitive après paiement. Les billets sont nominatifs et non remboursables, sauf annulation de l''événement.

**Article 3 : Annulation / Report**
En cas d''annulation de l''événement, le remboursement des billets sera effectué dans un délai de 30 jours. En cas de report, les billets restent valables ou peuvent être remboursés sur demande.

**Article 4 : Accès à l''événement**
La présentation du billet (imprimé ou sur smartphone) est obligatoire pour accéder à l''événement. Une pièce d''identité pourra être demandée.

**Article 5 : Responsabilité**
BilletEvent décline toute responsabilité en cas de perte, vol ou utilisation frauduleuse des billets.

**Article 6 : Données Personnelles**
Les données collectées sont utilisées uniquement pour la gestion de l''événement et ne sont pas partagées avec des tiers.

**Article 7 : Litiges**
Tout litige relatif à la vente de billets sera soumis à la compétence des tribunaux compétents.',
    '### Foire Aux Questions (FAQ)

**Q : "Puis-je acheter des billets sur place ?"**
R : "Non, tous les billets doivent être achetés en ligne via notre plateforme."

**Q : "Les billets sont-ils remboursables ?"**
R : "Non, les billets ne sont pas remboursables, sauf en cas d''annulation de l''événement par l''organisateur."

**Q : "Puis-je changer la date ou l''heure de mon créneau ?"**
R : "Non, une fois le créneau choisi et le billet acheté, il n''est pas possible de le modifier."

**Q : "L''événement est-il accessible aux personnes à mobilité réduite ?"**
R : "Oui, l''événement est conçu pour être accessible. Veuillez nous contacter pour toute demande spécifique."

**Q : "Y a-t-il un parking disponible ?"**
R : "Oui, un parking gratuit est disponible sur le site de l''événement."

**Q : "Puis-je venir avec mon animal de compagnie ?"**
R : "Pour des raisons de sécurité et d''hygiène, les animaux de compagnie ne sont pas autorisés sur le site de l''événement, à l''exception des chiens guides."

**Q : "Que se passe-t-il en cas de mauvais temps ?"**
R : "L''événement est maintenu en cas de pluie légère. En cas de conditions météorologiques extrêmes, l''événement pourra être annulé ou reporté. Les participants seront informés par e-mail."

**Q : "Comment puis-je contacter le support ?"**
R : "Vous pouvez nous contacter par e-mail à support@billetevent.com pour toute question ou assistance."',
    'Venez défier vos amis et votre famille lors de cette journée inoubliable ! Au programme : courses de sacs, tir à la corde, et bien d''autres épreuves traditionnelles. Restauration et buvette sur place. Activités poney et tir à l''arc disponibles sur réservation de créneaux spécifiques.
    
    **Date :** 25 Décembre 2025
    **Lieu :** Plaine des Palmistes
    **Heure :** 9h00 - 17h00
    
    Préparez-vous pour une journée pleine de rires et de défis !'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    event_date = EXCLUDED.event_date,
    sales_opening_date = EXCLUDED.sales_opening_date,
    sales_closing_date = EXCLUDED.sales_closing_date,
    status = EXCLUDED.status,
    cgv_content = EXCLUDED.cgv_content,
    faq_content = EXCLUDED.faq_content,
    key_info_content = EXCLUDED.key_info_content;

-- Insertion des pass pour l'événement "Les Défis Lontan"
INSERT INTO public.passes (id, event_id, name, price, description, initial_stock)
VALUES
    ('p1a2s3s4-e5f6-7890-1234-567890abcdef', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Pass Journée Adulte', 25.00, 'Accès complet à toutes les activités et défis de la journée (hors activités à créneaux).', 100),
    ('p5a6s7s8-e9f0-1234-5678-90abcdef0123', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Pass Journée Enfant (3-12 ans)', 15.00, 'Accès complet aux activités pour les enfants (hors activités à créneaux).', 150),
    ('p9a0s1s2-e3f4-5678-9012-34567890abcd', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Option Poney (Créneau)', 10.00, 'Session de 30 minutes avec un poney. Nécessite la sélection d''un créneau horaire.', NULL),
    ('p3a4s5s6-e7f8-9012-3456-7890abcdefgh', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Option Tir à l''Arc (Créneau)', 8.00, 'Session de 30 minutes de tir à l''arc. Nécessite la sélection d''un créneau horaire.', NULL);

-- Insertion des créneaux horaires pour l'événement "Les Défis Lontan"
-- Créneaux Poney
INSERT INTO public.time_slots (event_id, activity, slot_time, capacity)
VALUES
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'poney', '2025-12-25 09:30:00+00', 10),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'poney', '2025-12-25 10:30:00+00', 10),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'poney', '2025-12-25 11:30:00+00', 10),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'poney', '2025-12-25 14:00:00+00', 10),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'poney', '2025-12-25 15:00:00+00', 10);

-- Créneaux Tir à l'Arc
INSERT INTO public.time_slots (event_id, activity, slot_time, capacity)
VALUES
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'tir_arc', '2025-12-25 09:00:00+00', 15),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'tir_arc', '2025-12-25 10:00:00+00', 15),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'tir_arc', '2025-12-25 11:00:00+00', 15),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'tir_arc', '2025-12-25 13:30:00+00', 15),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'tir_arc', '2025-12-25 14:30:00+00', 15),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'tir_arc', '2025-12-25 15:30:00+00', 15);