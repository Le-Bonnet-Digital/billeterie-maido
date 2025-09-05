# AGENTS.md — Billeterie Maïdo (MVP serverless)

Ce fichier sert de **briefing** pour tous les agents de codage (OpenAI Codex ou autres). Il contient les informations indispensables pour comprendre la structure du projet, exécuter les tests et respecter les conventions. Les détails opérationnels du sprint sont déplacés dans des fichiers dédiés pour alléger ce document.

## 1. Objet

Ce dépôt suit un mode de développement agile timeboxé. À chaque commande “Passe au sprint suivant”, l’agent crée un environnement isolé sur la branche `work`, lit ce fichier et démarre un sprint de 25 minutes. Une seule PR est créée à la fin du sprint.

## 2. Préparation de l’environnement

Avant d’exécuter des tâches, l’agent doit disposer de toutes les dépendances et outils nécessaires, car l’environnement Codex n’a **pas accès à Internet**. Les dépendances doivent être installées dans le script de configuration (`Setup script` dans l’interface Codex) par le PO. Exemple :

```bash
# Exemple de script d’installation (à adapter)
npm install -g pnpm
pnpm install
pnpm run build
# Préparer la base de données locale et importer les migrations
```

Si une dépendance manque, l’agent doit l’indiquer dans `INTERACTIONS.yaml` pour que le PO l’ajoute avant le sprint suivant.

## 3. Build & Test

### Commandes de build et de test

- **Lancer tous les tests** : `pnpm test`
- **Lancer un test spécifique** : `pnpm test -- path/to/test-file.test.ts`
- **Exécuter le linter et le formatage** : `pnpm run lint` et `pnpm run format`
- **Démarrer en mode développement** : `pnpm dev`
- **Générer la documentation** : `pnpm run docs`

### Cadre de test

Les tests doivent être isolés : toute requête vers un service externe doit être mockée. Utiliser `msw` ou `vi.fn` pour simuler les API externes afin que les tests passent hors connexion.

## 4. Structure et conventions du projet

- **Sources** : tout le code applicatif se trouve dans `src/`.
- **Tests** : les fichiers de test se trouvent dans `tests/` ou `__tests__/`.
- **Migrations** : les scripts SQL se trouvent dans `migrations/`. Un dump de l’état de la base doit être enregistré dans `schema.sql` à chaque sprint.
- **Style de code** : respectez la configuration ESLint et Prettier du projet. Les noms de fichiers sont en `camelCase` pour le code et `PascalCase` pour les composants front.

Ajoutez ici les sections spécifiques à vos microservices ou à votre architecture (ex. dossiers `serverless/`, `data/`, etc.).

## 5. Workflow Git

- **Branche de travail** : `work`. Ne créez jamais de branches supplémentaires.
- **Commit** : effectuer des commits atomiques et respecter les conventions du projet (ex. `[feat]`, `[fix]`, `[chore]`).
- **PR** : une seule Pull Request par sprint (`work → main`) intitulée `Sprint S : <objectif principal>`.
- **Hook pre-commit** : le hook `.husky/pre-commit` doit réussir avant chaque commit. Il vérifie la présence des artefacts de sprint (`PLAN.md`, `BOARD.md`, `DEMO.md`, `REVIEW.md`, `RETRO.md`, `PREFLIGHT.md`, `INTERACTIONS.yaml`), le respect des conventions et la mise à jour de `schema.sql`. Un mode `ALLOW_EMPTY_SPRINT` permet de committer des fichiers de documentation sans lancer tous les tests.

## 6. Sprint process

Les détails du déroulement d’un sprint sont décrits dans `docs/process/SPRINT_PROCESS.md`. Ce fichier présente les étapes : pré‑vol, intégration du feedback, collecte et grooming du backlog, estimation, planification, exécution des différentes gates, checkpoint T+22, clôture et génération de la PR. Référez‑vous à ce document pendant le sprint.

## 7. Gestion du backlog et des user stories

- Les US sont listées dans `BACKLOG.md`.
- Chaque US doit respecter la *Definition of Ready* (persona, titre, valeur, priorité, au moins deux critères d’acceptation, note sécurité/RLS, champ `links.api` si origine `auto`).
- La vélocité est calculée sur la moyenne des trois derniers sprints et la capacité du sprint est fixée à 80 % de cette valeur. Réservez 10 % pour les improvements.
- Priorité : corriger d’abord les US ayant le statut `Fix` ou `KO`, puis les features urgentes, puis les improvements.

Un script de validation (`npm run validate:backlog`) doit s’assurer que toutes les US `Ready` respectent la DoR avant la planification.

## 8. Lignes directrices pour les PR

- Le message de PR doit inclure :
  - le résumé du sprint (US livrées et statut),
  - les instructions de test pour le PO (`DEMO.md`),
  - la métrique de vélocité (`committed_sp` vs `delivered_sp`),
  - les références aux fichiers du sprint (plan, board, revue, rétro).

## 9. Hiérarchie des instructions

Les instructions de ce fichier s’appliquent à l’ensemble du dépôt. Des fichiers `AGENTS.md` plus profonds (ex. pour chaque microservice) peuvent préciser des règles supplémentaires et prévalent sur celles‑ci en cas de conflit. Les instructions directes du PO (dans `PO_NOTES.md` ou via la commande) priment sur toute instruction écrite.
