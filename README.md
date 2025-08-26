# Billeterie Maïdo

[![CI](https://github.com/OWNER/billeterie-maido/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/billeterie-maido/actions/workflows/ci.yml)

## Prérequis

* [Node.js](https://nodejs.org/) version 18 ou supérieure
* [npm](https://www.npmjs.com/)
* [Supabase CLI](https://supabase.com/docs/reference/cli/installation)
* Compte Supabase avec base de données
* Fichier `.env` avec les variables :

  * `VITE_SUPABASE_URL`
  * `VITE_SUPABASE_ANON_KEY`

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

* Lancer le serveur de développement :

  ```bash
  npm run dev
  ```
* L'application est disponible sur [http://localhost:5173](http://localhost:5173).

## Tests et Lint

* Exécuter la suite de tests :

  ```bash
  npm test
  ```
* Générer le rapport de couverture :

  ```bash
  npm run test:coverage
  ```
* Vérifier la qualité du code avec ESLint :

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

* Les migrations SQL se trouvent dans le dossier `supabase/migrations`.
* Pour appliquer les migrations en local :

  ```bash
  supabase db reset
  ```

  ou

  ```bash
  supabase migration up
  ```
* Pour créer une nouvelle migration :

  ```bash
  supabase migration new <nom_de_migration>
  ```
* Les variables d'environnement Supabase doivent être définies dans le fichier `.env` :

  ```env
  VITE_SUPABASE_URL="https://votre-projet.supabase.co"
  VITE_SUPABASE_ANON_KEY="votre_clef_anon"
  ```

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
