/*
  # Initialisation de l'événement "Les Défis Lontan"
  
  1. Données de l'événement
    - Événement pré-configuré avec dates et contenus
    - Pass avec stocks définis selon les spécifications
    - Créneaux horaires générés automatiquement
    - Ressources poney configurées
    
  2. Utilisateur administrateur par défaut
    - Compte admin pour accéder au dashboard
*/

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

-- Insérer les pass pour l'événement
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
  NULL -- Stock illimité
) ON CONFLICT (id) DO NOTHING;

-- Insérer les ressources poney
INSERT INTO pony_resources (event_id, initial_stock) VALUES 
('defis-lontan-2025', 130) ON CONFLICT DO NOTHING;

-- Générer les créneaux pour le poney (de 8h30 à 18h, créneaux de 20 minutes, capacité 1)
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

-- Générer les créneaux pour le tir à l'arc (de 8h30 à 18h, créneaux de 20 minutes, capacité 15)
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