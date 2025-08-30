# Billeterie Maïdo

[![CI](https://github.com/OWNER/billeterie-maido/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/billeterie-maido/actions/workflows/ci.yml)

## Prérequis

- [Node.js](https://nodejs.org/) version 18 ou supérieure
- [npm](https://www.npmjs.com/)
- [Supabase CLI](https://supabase.com/docs/reference/cli/installation)
- Compte Supabase avec base de données
- Fichier `.env` avec les variables :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Installation

1. Cloner le dépôt :

   ```bash
   git clone <url>
   cd billeterie-maido
   ```

2. Installer les dépendances :

   ```bash
   npm install
   ```

3. Créer un fichier `.env` à la racine et y définir les variables décrites ci-dessus.

## Gestion des variables sensibles

Les clés API, jetons et autres secrets doivent être fournis via des variables d'environnement et ne doivent jamais être commités dans le dépôt.

- Le fichier `.env` est ignoré par Git et ne doit être utilisé qu'en développement local.
- En production, configurez les variables d'environnement directement dans votre plateforme d'hébergement.
- `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont nécessaires au runtime et doivent rester accessibles après le déploiement.
- Les secrets sensibles (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET`, `WEBHOOK_SECRET`) sont configurés via `setup.sh` et ne sont pas conservés dans l'environnement.
- Le hook de pré-commit exécute [`git-secrets`](https://github.com/awslabs/git-secrets) pour éviter les fuites accidentelles. Installez l'outil puis lancez `git secrets --install` avant de contribuer.

## Structure du projet

```
├── src
│   ├── components    # Composants React
│   ├── hooks         # Hooks personnalisés
│   ├── lib           # Modules utilitaires et accès Supabase
│   ├── pages         # Pages de l'application
│   └── services      # Logique métier réutilisable
├── supabase          # Migrations SQL et configuration Supabase
└── tests             # Tests unitaires
```

## Développement

- Lancer le serveur de développement :

  ```bash
  npm run dev
  ```

- L'application est disponible sur [http://localhost:5173](http://localhost:5173).

## Tests et Lint

- Exécuter la suite de tests :

  ```bash
  npm test
  ```

- Exécuter les tests UI/UX et accessibilité :

  ```bash
  npm run test:ui
  ```

  Chaque modification visuelle doit mettre à jour ces tests.

- Générer le rapport de couverture :

  ```bash
  npm run test:coverage
  ```

- Vérifier la qualité du code avec ESLint :

  ```bash
  npm run lint
  ```

## Déploiement

1. Construire l'application pour la production :

   ```bash
   npm run build
   ```

2. Prévisualiser la version production :

   ```bash
   npm run preview
   ```

3. Déployer le contenu du dossier `dist/` sur la plateforme de votre choix et y configurer les variables d'environnement Supabase.

## Configuration Supabase

### Secrets

Pour configurer les secrets nécessaires aux fonctions Supabase, exécutez le script `setup.sh` :

```bash
SUPABASE_SERVICE_ROLE_KEY=<clé> STRIPE_SECRET=<clé> WEBHOOK_SECRET=<clé> ./setup.sh
```

Ce script lit les variables d'environnement fournies et les enregistre via `supabase secrets set`.

Pour mettre à jour un environnement déjà configuré (dépendances, migrations), exécutez `./maintenance.sh`.

- Les migrations SQL se trouvent dans le dossier `supabase/migrations`.
- Pour appliquer les migrations en local :

  ```bash
  supabase db reset
  ```

  ou

  ```bash
  supabase migration up
  ```

- Pour créer une nouvelle migration :

  ```bash
  supabase migration new <nom_de_migration>
  ```

- Les variables d'environnement Supabase doivent être définies dans le fichier `.env` :

  ```env
  VITE_SUPABASE_URL="https://votre-projet.supabase.co"
  VITE_SUPABASE_ANON_KEY="votre_clef_anon"
  ```

````

### Tâches planifiées

Une tâche `pg_cron` exécute `cleanup_expired_cart_items` toutes les 15 minutes afin de supprimer automatiquement les paniers expirés. Elle est définie dans `supabase/migrations/20250901093000_schedule_cleanup_expired_cart_items.sql` et est appliquée lors de l'exécution des migrations (`supabase db reset` ou `supabase migration up`).

## Rôles et Accès

- Rôles supportés: `admin`, `pony_provider`, `archery_provider`, `luge_provider`, `atlm_collaborator`, `client`.
- Lien "Admin" masqué pour tous sauf les `admin` (le garde `/admin` redirige vers une page de connexion Administrateur).
- Gestion des rôles depuis `/admin/users` (réservé aux `admin`).
- Espace prestataires accessible via `/provider` avec sous-pages:
  - `/provider/pony` (validation poney)
  - `/provider/archery` (validation tir à l'arc)
  - `/provider/luge` (remise bracelet luge)

### Gestion des utilisateurs

L'interface d'administration `/admin/users` offre des outils pour rechercher et modifier les comptes :

- **Filtres** : par adresse email (recherche partielle) et par rôle.
- **Actions groupées** : mise à jour du rôle et suppression de plusieurs utilisateurs sélectionnés.

Cette page utilise Supabase pour interroger la table `users` (`select`, `eq`, `ilike`) et appliquer les modifications (`update`/`delete` avec `in`). Les politiques RLS de Supabase garantissent que seules les personnes ayant le rôle `admin` peuvent consulter ou modifier les autres comptes.

## Scan / Validation

- Le scan utilise le numéro de réservation encodé dans le QR (les lecteurs se comportent comme un clavier).
- La validation sur site se fait en scannant un QR par participant (un QR code par numéro de réservation).
- Les validations sont enregistrées dans la table `reservation_validations` (migration incluse), avec activité: `poney`, `tir_arc`, `luge_bracelet`.

## Profil Utilisateur

- Page `/profile` (si connecté) pour consulter ses réservations dans le respect RGPD.
- Pour retrouver un billet sans compte, utiliser `/find-ticket` (renvoi par email).

### Billets du Parc (par Activités + Variantes)

Les billets du parc sont gérés dans un domaine dédié, indépendant des événements:

- `activities` (existant): champs côté parc ajoutés (activation, description, catégorie, ordre, besoin de créneau).
- `activity_variants`: variantes/forfaits par activité (nom, prix, stock, ordre, actif).
- `park_time_slots`: créneaux pour une activité (capacité par créneau).

Migrations principales: `supabase/migrations/*_activity_variants.sql`, `*_cart_items_product*.sql`.

RPC disponibles:
- `get_parc_activities_with_variants()` → liste des activités parc avec variantes + stock restant.
- `get_activity_variant_remaining_stock(variant_uuid)` → stock restant d’une variante.

Frontend:
- La section “Billets du Parc” lit `get_parc_activities_with_variants()` et affiche les variantes actives par activité.

Administration:
- “Admin → Offres Parc” pour créer/activer/ordonner les offres et lier des activités (avec option “créneau requis” + stock par activité).

### Panier et informations participant

Le panier supporte des informations par billet (participant) optionnelles, utiles pour les passes nécessitant un créneau ou une vérification d’accès.

- Colonnes: `attendee_first_name`, `attendee_last_name`, `attendee_birth_year`, `access_conditions_ack` ajoutées à `cart_items`.
- Si la base n’est pas migrée, le front rétrograde automatiquement la requête (fallback) pour rester fonctionnel.
- Appliquer la migration SQL via Supabase CLI ou l’éditeur SQL:

```sql
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS attendee_first_name text,
  ADD COLUMN IF NOT EXISTS attendee_last_name text,
  ADD COLUMN IF NOT EXISTS attendee_birth_year integer,
  ADD COLUMN IF NOT EXISTS access_conditions_ack boolean DEFAULT false;
````

### Page d’accueil et événements

La page d’accueil affiche d’abord les « Événements en cours » (ventes ouvertes) avec date, statut, extrait d’informations clés, et liens « Voir les Billets », « FAQ », « CGV ». Le « Prochain événement publié » est mis en avant dans le bandeau.

### Promouvoir un utilisateur en admin

1. Récupérez l'UUID de l'utilisateur à promouvoir.
2. Dans le projet Supabase, exécutez la requête SQL suivante pour ajouter ou mettre à jour son rôle :

   ```sql
   insert into public.users (id, role)
   values ('<uuid-utilisateur>', 'admin')
   on conflict (id) do update set role = 'admin';
   ```

   Cette requête garantit que l'entrée de `public.users` correspond à `auth.uid()` avec `role = 'admin'`.

3. La policy `"Admins can manage events"` s'appuie sur cette table pour vérifier le rôle administrateur.
   Si votre application préfère utiliser un claim JWT pour stocker le rôle, adaptez la policy en conséquence et
   assurez‑vous que le token contient `{"role": "admin"}`.

## Debugging

Définissez la variable d'environnement `VITE_DEBUG=true` lors de l'exécution en développement pour activer le logger centralisé et obtenir des messages détaillés.
Par exemple :

```bash
VITE_DEBUG=true npm run dev
```

Les logs sont automatiquement désactivés dans les builds de production.

## Mode démonstration

Pour afficher un message indiquant qu'il s'agit d'un environnement de démonstration, définissez la variable d'environnement `VITE_SHOW_TEST_CREDENTIALS` à `true`.

```bash
VITE_SHOW_TEST_CREDENTIALS=true npm run dev
```

Ou ajoutez cette variable à votre fichier `.env` :

```env
VITE_SHOW_TEST_CREDENTIALS=true
```

## Contribution

Les contributions sont les bienvenues ! Merci de proposer vos améliorations via des pull requests. Avant de soumettre, exécutez
`npm test` et `npm run lint` et suivez les recommandations décrites dans [CONTRIBUTING.md](./CONTRIBUTING.md).
