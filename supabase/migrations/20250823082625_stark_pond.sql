-- Ce script configure l'intégralité du schéma de la base de données pour l'application de billetterie.
-- Il inclut la création des tables, des fonctions, des triggers, des politiques de sécurité (RLS)
-- et l'insertion des données initiales pour l'événement "Les Défis Lontan".

-- IMPORTANT : Exécutez ce script EN ENTIER dans l'éditeur SQL de Supabase.
-- Si vous rencontrez une erreur, veuillez noter le message d'erreur exact et la ligne.

-- 1. Suppression des objets existants (pour permettre une exécution idempotente)
-- Les tables sont supprimées dans l'ordre inverse de leurs dépendances pour éviter les erreurs de clé étrangère.
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.pony_resources CASCADE;
DROP TABLE IF EXISTS public.time_slots CASCADE;
DROP TABLE IF EXISTS public.passes CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Suppression des fonctions et triggers
DROP TRIGGER IF EXISTS trigger_set_reservation_number ON public.reservations;
DROP FUNCTION IF EXISTS public.set_reservation_number();
DROP FUNCTION IF EXISTS public.get_pass_remaining_stock(pass_uuid uuid);
DROP FUNCTION IF EXISTS public.get_slot_remaining_capacity(slot_uuid uuid);
DROP FUNCTION IF EXISTS public.cleanup_expired_cart_items();

-- 2. Création des Tables

-- Table: public.users
-- Gère les utilisateurs de l'application avec différents rôles.
CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT auth.uid(),
    email text NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'pony_provider', 'archery_provider', 'client')),
    created_at timestamp with time zone DEFAULT now()
);

-- Table: public.events
-- Stocke les informations sur les événements.
CREATE TABLE public.events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    event_date date NOT NULL,
    sales_opening_date timestamp with time zone NOT NULL,
    sales_closing_date timestamp with time zone NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'finished', 'cancelled')),
    cgv_content text DEFAULT '', -- Conditions Générales de Vente
    faq_content text DEFAULT '',  -- Foire Aux Questions
    key_info_content text DEFAULT '', -- Informations clés de l'événement
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: public.passes
-- Définit les différents types de billets (pass) pour un événement.
CREATE TABLE public.passes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    description text DEFAULT '',
    initial_stock integer, -- NULL signifie stock illimité
    created_at timestamp with time zone DEFAULT now()
);

-- Table: public.time_slots
-- Gère les créneaux horaires pour les activités spécifiques (ex: poney, tir à l'arc).
CREATE TABLE public.time_slots (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    activity text NOT NULL CHECK (activity IN ('poney', 'tir_arc')),
    slot_time timestamp with time zone NOT NULL,
    capacity integer NOT NULL DEFAULT 15,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: public.pony_resources
-- Exemple de table pour la gestion de ressources spécifiques (non directement utilisée dans la logique actuelle de l'app).
CREATE TABLE public.pony_resources (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    initial_stock integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: public.reservations
-- Enregistre les réservations effectuées par les clients.
CREATE TABLE public.reservations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_number text NOT NULL UNIQUE, -- Numéro de réservation unique généré
    client_email text NOT NULL,
    pass_id uuid REFERENCES public.passes(id),
    time_slot_id uuid REFERENCES public.time_slots(id),
    payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
    created_at timestamp with time zone DEFAULT now()
);

-- Table: public.cart_items
-- Stocke les articles temporaires dans le panier d'un utilisateur.
CREATE TABLE public.cart_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id text NOT NULL, -- ID de session pour les paniers anonymes
    pass_id uuid REFERENCES public.passes(id),
    time_slot_id uuid REFERENCES public.time_slots(id),
    quantity integer NOT NULL DEFAULT 1,
    reserved_until timestamp with time zone DEFAULT (now() + interval '10 minutes'), -- Durée de réservation du panier
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Création des Index
-- Améliorent les performances des requêtes courantes.
CREATE INDEX idx_events_dates ON public.events (event_date, sales_opening_date, sales_closing_date);
CREATE INDEX idx_events_status ON public.events (status);
CREATE INDEX idx_passes_event ON public.passes (event_id);
CREATE INDEX idx_time_slots_event ON public.time_slots (event_id, activity);
CREATE INDEX idx_reservations_email ON public.reservations (client_email);
CREATE INDEX idx_cart_items_reserved_until ON public.cart_items (reserved_until);
CREATE INDEX idx_cart_items_session ON public.cart_items (session_id);

-- 4. Création des Fonctions SQL (PL/pgSQL)

-- Fonction: public.set_reservation_number()
-- Génère un numéro de réservation unique avant l'insertion d'une nouvelle réservation.
CREATE OR REPLACE FUNCTION public.set_reservation_number()
RETURNS TRIGGER AS $$
DECLARE
    new_reservation_number TEXT;
BEGIN
    LOOP
        -- Génère une chaîne alphanumérique aléatoire de 8 caractères
        new_reservation_number := upper(overlay(overlay(md5(random()::text || clock_timestamp()::text) placing '' from 9 for 24) placing '' from 1 for 8));
        -- Vérifie si le numéro existe déjà
        IF NOT EXISTS (SELECT 1 FROM public.reservations WHERE reservation_number = new_reservation_number) THEN
            NEW.reservation_number := new_reservation_number;
            RETURN NEW;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction: public.get_pass_remaining_stock(pass_uuid uuid)
-- Calcule le stock restant pour un pass donné, en tenant compte des articles réservés et vendus.
CREATE OR REPLACE FUNCTION public.get_pass_remaining_stock(pass_uuid uuid)
RETURNS integer AS $$
DECLARE
    initial_stock_val integer;
    reserved_quantity integer;
    sold_quantity integer;
BEGIN
    SELECT initial_stock INTO initial_stock_val FROM public.passes WHERE id = pass_uuid;

    IF initial_stock_val IS NULL THEN
        RETURN 999999; -- Stock illimité
    END IF;

    -- Quantité réservée dans les articles de panier actifs
    SELECT COALESCE(SUM(quantity), 0) INTO reserved_quantity
    FROM public.cart_items
    WHERE pass_id = pass_uuid AND reserved_until > now();

    -- Quantité vendue dans les réservations payées
    SELECT COALESCE(COUNT(*), 0) INTO sold_quantity
    FROM public.reservations
    WHERE pass_id = pass_uuid AND payment_status = 'paid';

    RETURN initial_stock_val - reserved_quantity - sold_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER permet à la fonction de lire les tables même avec RLS

-- Fonction: public.get_slot_remaining_capacity(slot_uuid uuid)
-- Calcule la capacité restante pour un créneau horaire donné.
CREATE OR REPLACE FUNCTION public.get_slot_remaining_capacity(slot_uuid uuid)
RETURNS integer AS $$
DECLARE
    capacity_val integer;
    reserved_quantity integer;
    sold_quantity integer;
BEGIN
    SELECT capacity INTO capacity_val FROM public.time_slots WHERE id = slot_uuid;

    -- Quantité réservée dans les articles de panier actifs
    SELECT COALESCE(SUM(quantity), 0) INTO reserved_quantity
    FROM public.cart_items
    WHERE time_slot_id = slot_uuid AND reserved_until > now();

    -- Quantité vendue dans les réservations payées
    SELECT COALESCE(COUNT(*), 0) INTO sold_quantity
    FROM public.reservations
    WHERE time_slot_id = slot_uuid AND payment_status = 'paid';

    RETURN capacity_val - reserved_quantity - sold_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: public.cleanup_expired_cart_items()
-- Supprime les articles de panier dont la durée de réservation a expiré.
CREATE OR REPLACE FUNCTION public.cleanup_expired_cart_items()
RETURNS void AS $$
BEGIN
    DELETE FROM public.cart_items WHERE reserved_until <= now();
END;
$$ LANGUAGE plpgsql;

-- 5. Création des Triggers

-- Trigger pour la génération du numéro de réservation
CREATE TRIGGER trigger_set_reservation_number
BEFORE INSERT ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.set_reservation_number();

-- 6. Configuration de la Sécurité au Niveau des Lignes (RLS - Row Level Security)

-- Active RLS sur toutes les tables pertinentes
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pony_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour public.events
CREATE POLICY "Admins can manage events" ON public.events
FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Anyone can view published events" ON public.events
FOR SELECT USING (status = 'published');

-- Politiques RLS pour public.passes
CREATE POLICY "Admins can manage passes" ON public.passes
FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Anyone can view passes for published events" ON public.passes
FOR SELECT USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = passes.event_id AND e.status = 'published'));

-- Politiques RLS pour public.time_slots
CREATE POLICY "Admins can manage time slots" ON public.time_slots
FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Anyone can view time slots for published events" ON public.time_slots
FOR SELECT USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = time_slots.event_id AND e.status = 'published'));

-- Politiques RLS pour public.pony_resources
CREATE POLICY "Admins can manage pony resources" ON public.pony_resources
FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Politiques RLS pour public.users
CREATE POLICY "Admins can view all users" ON public.users
FOR SELECT USING (EXISTS (SELECT 1 FROM public.users users_1 WHERE users_1.id = auth.uid() AND users_1.role = 'admin'));

CREATE POLICY "Users can view their own profile" ON public.users
FOR SELECT USING (id = auth.uid());

-- Politiques RLS pour public.reservations
CREATE POLICY "Admins can manage all reservations" ON public.reservations
FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Users can view reservations by email" ON public.reservations
FOR SELECT USING (true); -- Permet à n'importe qui de rechercher par email. Peut être restreint si nécessaire.

-- Politiques RLS pour public.cart_items
CREATE POLICY "Anyone can manage their cart items" ON public.cart_items
FOR ALL USING (true); -- Permet la gestion des paniers anonymes.

-- 7. Insertion des Données Initiales

-- Insertion d'un utilisateur admin (ID et email peuvent être adaptés)
-- Note : L'authentification des utilisateurs est gérée par Supabase Auth. Cet utilisateur est pour les rôles RLS.
INSERT INTO public.users (id, email, role)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@example.com', 'admin')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;

-- Insertion de l'événement "Les Défis Lontan"
INSERT INTO public.events (id, name, event_date, sales_opening_date, sales_closing_date, status, cgv_content, faq_content, key_info_content)
VALUES (
    'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10',
    'Les Défis Lontan',
    '2025-12-25',
    '2025-08-01 09:00:00+00',
    '2025-12-24 23:59:59+00',
    'published',
    '### Conditions Générales de Vente\n\nBienvenue aux Défis Lontan ! En achetant un billet, vous acceptez les conditions suivantes :\n\n*   **Non-remboursable :** Tous les billets sont non-remboursables, sauf en cas d''annulation de l''événement par l''organisateur.\n*   **Transfert :** Les billets sont nominatifs et non transférables.\n*   **Accès :** L''accès à l''événement est soumis à la présentation d''un billet valide et d''une pièce d''identité.\n*   **Sécurité :** Les organisateurs se réservent le droit de refuser l''accès à toute personne présentant un comportement inapproprié.\n*   **Modifications :** Le programme et les horaires peuvent être sujets à modification sans préavis.\n\nMerci de votre compréhension et profitez bien des Défis Lontan !',
    '### Foire Aux Questions (FAQ)\n\nQ : "Quand et où se déroulent Les Défis Lontan ?"\nR : "L''événement aura lieu le 25 décembre 2025, à la Plaine des Cafres."\n\nQ : "Comment puis-je acheter des billets ?"\nR : "Les billets sont disponibles à l''achat directement sur notre site web. Sélectionnez le pass de votre choix et suivez les étapes de paiement."\n\nQ : "Les billets sont-ils remboursables ?"\nR : "Non, tous les billets sont non-remboursables. Veuillez consulter nos Conditions Générales de Vente pour plus de détails."\n\nQ : "Puis-je transférer mon billet à quelqu''un d''autre ?"\nR : "Non, les billets sont nominatifs et non transférables."\n\nQ : "Y aura-t-il de la restauration sur place ?"\nR : "Oui, plusieurs stands de restauration locale seront disponibles sur le site de l''événement."\n\nQ : "Que faire si j''ai un problème avec ma réservation ?"\nR : "Contactez notre support client à support@billetevent.com avec votre numéro de réservation et votre adresse e-mail."',
    'Venez découvrir les traditions et les jeux lontan de La Réunion ! Une journée inoubliable pour toute la famille avec des activités uniques et des saveurs locales. Au programme : courses de sacs, tir à l''arc traditionnel, et bien plus encore !'
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
    updated_at = now();

-- Insertion des Pass pour "Les Défis Lontan"
INSERT INTO public.passes (id, event_id, name, price, description, initial_stock)
VALUES
    ('d1a2e3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'Pass Adulte', 25.00, 'Accès complet à toutes les activités et spectacles pour les adultes.', 500),
    ('e1a2e3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'Pass Enfant (3-12 ans)', 15.00, 'Accès complet pour les enfants, incluant les ateliers spécifiques.', 300),
    ('f1a2e3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'Pass Famille (2 adultes + 2 enfants)', 70.00, 'Offre spéciale pour les familles, accès illimité aux activités.', 100),
    ('g1a2e3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'Pass Marmaille (Poney)', 10.00, 'Accès à une session de poney pour les plus jeunes. Nécessite la réservation d''un créneau horaire.', 100),
    ('h1a2e3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'Pass Tir à l''Arc', 12.00, 'Accès à une session de tir à l''arc. Nécessite la réservation d''un créneau horaire.', 100);
ON CONFLICT (id) DO UPDATE SET
    event_id = EXCLUDED.event_id,
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    initial_stock = EXCLUDED.initial_stock;

-- Insertion des Créneaux Horaires pour "Les Défis Lontan" (Poney et Tir à l'Arc)
-- Les créneaux sont pour le 25 décembre 2025. L'offset +04 est un exemple de fuseau horaire.
INSERT INTO public.time_slots (id, event_id, activity, slot_time, capacity)
VALUES
    -- Créneaux Poney
    ('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'poney', '2025-12-25 09:00:00+04', 10),
    ('2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'poney', '2025-12-25 10:00:00+04', 10),
    ('3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'poney', '2025-12-25 11:00:00+04', 10),
    ('4a5b6c7d-8e9f-0a1b-2c3d-4e5f6a7b8c9d', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'poney', '2025-12-25 14:00:00+04', 10),
    ('5a6b7c8d-9e0f-1a2b-3c4d-5e6f7a8b9c0d', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'poney', '2025-12-25 15:00:00+04', 10),
    -- Créneaux Tir à l'Arc
    ('6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'tir_arc', '2025-12-25 09:30:00+04', 15),
    ('7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'tir_arc', '2025-12-25 10:30:00+04', 15),
    ('8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'tir_arc', '2025-12-25 11:30:00+04', 15),
    ('9a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'tir_arc', '2025-12-25 14:30:00+04', 15),
    ('0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d', 'c0a8e2b0-1d2c-4e5f-8a7b-6c5d4e3f2a10', 'tir_arc', '2025-12-25 15:30:00+04', 15);
ON CONFLICT (id) DO UPDATE SET
    event_id = EXCLUDED.event_id,
    activity = EXCLUDED.activity,
    slot_time = EXCLUDED.slot_time,
    capacity = EXCLUDED.capacity;