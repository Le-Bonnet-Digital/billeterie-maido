# AGENTS

Ce document définit les règles à suivre pour contribuer au projet. **Chaque collaborateur doit le lire avant toute contribution.**

## Environnement
- Utiliser Node.js 18 ou version supérieure.
- Utiliser `npm` pour l'installation et l'exécution des scripts.
- Ne jamais committer de fichiers `.env` ou d'autres secrets.

## Git & Workflow
- Créer une branche depuis `main` pour chaque fonctionnalité ou correctif.
- Écrire des messages de commit clairs à l'impératif.
- Pousser des commits atomiques et logiques.
- Ouvrir une Pull Request dès qu'une contribution est prête à être revue.

## Hooks Git
- `pre-commit` : `npm run lint && npm test && lint-staged`
- `commit-msg` : `npx commitlint --edit "$1"`

## Qualité & Style
- Respecter les configurations ESLint et TypeScript existantes.
- Lancer `npm run lint` et `npm test` avant de soumettre des changements.
- Préférer un code lisible, typé et sans warnings.

## Sécurité
- Ne jamais exposer de secrets, mots de passe ou clés d'API dans le dépôt.
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
