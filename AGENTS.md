# AGENTS

Ce document définit les règles à suivre pour contribuer au projet. **Chaque collaborateur doit le lire avant toute contribution.**

## Environnement

- Utiliser Node.js 18 ou version supérieure.
- Exécuter `./setup.sh` une fois pour installer les dépendances, appliquer les migrations et configurer les secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET`, `WEBHOOK_SECRET`).
- Pour les relances sur un conteneur mis en cache, utiliser `./maintenance.sh` pour mettre à jour les dépendances et exécuter les migrations.
- Définir les variables d'environnement nécessaires à l'exécution (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Utiliser `npm` pour l'installation et l'exécution des scripts.
- Ne jamais committer de fichiers `.env` ou d'autres secrets.

## Commandes :

- Installer les dépendances : `npm install`
- Lancer le serveur de développement : `npm run dev`
- Construire l'application : `npm run build`
- Lancer les tests : `npm test`
- Lancer le lint : `npm run lint`
- Générer la couverture : `npm run test:coverage`
- Formater le code : `npm run format`

## Git & Workflow

- Créer une branche depuis `main` pour chaque fonctionnalité ou correctif.
- Nommer les branches de façon descriptive (ex. `feature/xyz`).
- Écrire des messages de commit clairs à l'impératif en suivant la convention [Conventional Commits](https://www.conventionalcommits.org/).
- Pousser des commits atomiques et logiques.
- Ouvrir une Pull Request dès qu'une contribution est prête à être revue.

## Hooks Git

- `pre-commit` : `npm run lint && npm test && lint-staged`
- `commit-msg` : `npx commitlint --edit "$1"`

## Qualité & Style

- Respecter les configurations ESLint, Prettier et TypeScript existantes.
- Lancer `npm run lint` et `npm test` avant de soumettre des changements.
- Préférer un code lisible, typé et sans warnings.
- TypeScript doit utiliser le mode `strict`.
- Valider les entrées et gérer les erreurs avec des tests unitaires.
- `console.log` est interdit (utiliser le logger ou `console.warn`/`console.error`).
- L'usage de `any` est interdit sans justification explicite.

## Sécurité

- Ne jamais exposer de secrets, mots de passe ou clés d'API dans le dépôt.
- Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont requises au runtime.
- Les secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET`, `WEBHOOK_SECRET`) doivent être fournis via `setup.sh`.
- Vérifier les dépendances et maintenir le projet à jour.

## UI/UX

- Privilégier un design accessible et responsive.
- Réutiliser les composants existants et suivre les conventions de style.

## Documentation

- Mettre à jour la documentation (README, architecture, etc.) lors de l'ajout de fonctionnalités.
- Ajouter des commentaires aux parties complexes du code.

## Definition of Done

- Les tests et le lint passent (`npm test`, `npm run lint`).
- La fonctionnalité est documentée et testée.
- La Pull Request est relue et reçoit au moins une approbation.
- Pas de TODO ou de code mort restant.
