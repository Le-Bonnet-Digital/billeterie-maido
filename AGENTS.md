# AGENTS.md — Billeterie Maïdo (MVP, sprint timebox 25 min)

## 0) Objet

Manuel d’exécution pour **ChatGPT**. À la commande **« Passe au sprint suivant »**, ChatGPT crée son environnement isolé **sur `work`**, lit ce fichier et exécute **un sprint timeboxé 25 minutes** en jouant tous les rôles (PM, SM, Serverless/Backend, Data, Front, QA, Code Review).
👉 **Aucune autre branche/environnement** n’est créé.

## 1) Contrats d’exécution

* **Branche** : unique, `work`.
* **PR** : **une seule PR en fin de sprint** → `work → main`, titre : `Sprint S<N>: <résumé>`.
* **Timebox** : 25 min (gel **T+22** pour docs/review/rétro/PO\_NOTES).
* **Autonomie produit** : si besoin, ChatGPT **propose, crée et sélectionne** les US nécessaires (MVP + qualité irréprochable), sans imposer de techno hors conventions du repo.
* **Rôle du PO** : fournit **OK/KO**, **secrets/clé API**, **orientations** dans `PO_NOTES.md`.
* **Qualité** : respecter `QUALITY-GATES.md` et `DoD.md`.
* **Sécurité** : pas de secrets en repo ; idempotence ; **RLS/policies** testées ; headers sécurité ; rate-limit endpoints publics.

## 2) Mode Sprint (commande : « Passe au sprint suivant »)

1. **Bootstrap & minuteur**

   * Démarrer un **minuteur 25 min** (checkpoints **T+10**, **T+22**).
   * Créer `/docs/sprints/S<N>/` si absent et initialiser : `PLAN.md`, `BOARD.md`, `DEMO.md`, `REVIEW.md`, `RETRO.md`, **`PREFLIGHT.md`** (nouveau).

2. **Pré-vol (audit existant – code + BDD) → `PREFLIGHT.md`**

   * **Portée code (repo)** :

     * Cartographier le **module concerné** par la/les US ciblées (recherche usages, TODO/FIXME, flags, endpoints, contrats, tests).
     * Détecter **doublons**, **code mort/obsolète**, **tech-debt bloquante** ; proposer des **refactors minimaux** (sans déborder du timebox).
   * **Portée BDD** :

     * Lire l’état courant du schéma (migrations / RLS / fonctions).
     * **Tenir `schema.sql` à jour** : demander au PO d’exécuter la commande de snapshot si nécessaire (et consigner l’horodatage dans `PREFLIGHT.md`) :

       * Supabase/Postgres (exemple) :

         ```
         supabase db dump --schema public -f schema.sql
         ```
       * (Si SQL Server) :

         ```
         sqlpackage /Action:Export /SourceConnectionString:"<...>" /TargetFile:schema.sql
         ```
     * Lister **écarts** entre l’existant et les besoins des US (tables, colonnes, indexes, RLS).
   * **Sorties obligatoires dans `PREFLIGHT.md`** :

     * *Code audit* (risques, doublons, code mort + décisions de nettoyage).
     * *DB audit* (écarts, migrations envisagées).
     * `schema.sql RefreshedAt: <ISO>` (ou “unchanged” si déjà à jour).
     * **Actions de nettoyage** planifiées dans le sprint ou mises en `improvement` (US type `improvement` avec `sp`).

3. **Intégrer review & rétro (apprentissage)**

   * Lire `PO_NOTES.md` → `SPRINT_HISTORY` & `RETRO/improvements`, ajuster pratiques (et `QUALITY-GATES.md` si besoin).

4. **Collecte & grooming automatique**

   * Lire `BACKLOG.md` (`Ready`), `PO_NOTES.md/SPRINT_INPUT`, `README.md`, `DoD.md`, `QUALITY-GATES.md`.
   * **Si aucune US `Ready`** :

     * Source 1 : `PO_NOTES.md/NEW_FEATURES` → **générer** des US.
     * Si vide/insuffisant : **discovery produit** → consigner idées dans `PO_NOTES.md/NEW_FEATURES` puis **créer** les US dans `BACKLOG.md`.
     * Chaque US auto-générée doit contenir : `id`, `title`, `value`, `priority`, `type`, **≥ 2 AC**, **note sécurité/RLS**, `links.api` **placeholder**, `origin: auto`, `status: Ready`.

5. **Estimation & capacité**

   * Estimer `sp ∈ {1,2,3,5,8,13}`.
   * **Vélocité** = moyenne des `delivered_sp` (3 derniers sprints, défaut = 8).
   * **Capacité engagée** = `floor(vélocité × 0.8)`, réserver ≈ 10 % aux **improvements** (dont **nettoyage identifié en pré-vol**).

6. **Planification**

   * Sélectionner des US jusqu’à **capacité** ; marquer `Selected`, `sprint: N`, `sp`.
   * Répercuter dans `/docs/sprints/S<N>/PLAN.md` et initialiser `BOARD.md` (colonnes `Selected → InSprint → Done → Spillover`).

7. **Exécution (A→B→C→D), sans PR intermédiaire**

   * Par US : `Selected → InSprint → Done` en passant les **gates** :

     * **Gate A — Serverless/Backend** : contrats/API DTO validés, **idempotence**, tests unit/inté, logs.
     * **Gate B — Data** : migrations + rollback, **RLS** testées, index/contr., fonctions SQL atomiques + tests concurrence.
     * **Gate C — Front** : UI responsive, a11y/perf ≥ 90, états *loading/empty/error/success*, VRT OK, intégration contrats.
     * **Gate D — QA** : E2E (happy + 2 erreurs), tests rôle/RLS, charge ciblée si critique, `QA_CHECKLIST.md` coché.
   * Mettre à jour `owner` (serverless → data → frontend → qa) et `BOARD.md`.
   * **Nettoyage pré-vol** : supprimer **code mort** identifié si sans risque (tests verts), sinon créer US `improvement` (Spillover si hors capacité).
   * Dépassement : basculer l’US en `Spillover`.

8. **Checkpoint T+22 (gel)**

   * **Geler le code**. Compléter `DEMO.md`, `REVIEW.md`, `RETRO.md`, **finaliser `PREFLIGHT.md`** (résumé des changements & nettoyage réalisé).
   * Renseigner **`PO_NOTES.md/INTERACTIONS`** (entrée horodatée) avec **tests prod** à exécuter pour valider/invalider le sprint.

9. **Clôture & PR unique**

   * Calculer `committed_sp` vs `delivered_sp`, écrire **`SPRINT_HISTORY`** (incl. focus factor) dans `PO_NOTES.md`.
   * Ouvrir **une PR** `work → main` intitulée `Sprint S<N>: <résumé>`.
   * Après merge : marquer les US livrées en **`Merged`**.

## 3) Backlog — statuts & schéma US

* `status`: `Ready | Selected | InSprint | Done | Spillover | Merged`
* `owner`: `serverless | data | frontend | qa`
* `sp`: `1|2|3|5|8|13`
* `sprint`: `<N|null>`
* `type`: `feature | improvement | fix`
* `origin`: `po | auto`
* `links.api`: chemin d’un contrat d’API/DTO (placeholder accepté pour `origin: auto`)

> **Pré-vol obligatoire** : avant toute implémentation, vérifier **existant (code + BDD)**, documenter dans `PREFLIGHT.md`, et s’assurer que `schema.sql` est **à jour** (ou justifier).

## 4) Garde-fous (PR bloquante si non respectés)

Le workflow **`sprint-guard.yml`** doit vérifier :

1. `/docs/sprints/S<N>/{PLAN.md, BOARD.md, DEMO.md, REVIEW.md, RETRO.md, PREFLIGHT.md}` existent.
2. `PREFLIGHT.md` contient **section Code audit** & **DB audit** + `schema.sql RefreshedAt` (ou justification “unchanged”).
3. `PO_NOTES.md/INTERACTIONS` a l’entrée **Sprint S<N>** avec **tests prod**.
4. `BACKLOG.md` :

   * Chaque US **livrée** est `Done` (les `Spillover` exclus de la démo).
   * US `origin: auto` en `Done` : **`links.api`**, **≥ 2 AC**, **note sécurité/RLS**.
   * Chaque US `Done` a un `sp` et un `type`.
5. `CHANGELOG.md` : section **\[Unreleased]** résumant le sprint.
6. **CI verte** (lint, build, tests, Lighthouse), couverture ≥ **80 %** des nouvelles lignes.

## 5) Journal PO & décisions

* À chaque sprint, ChatGPT ajoute une entrée **horodatée** dans `PO_NOTES.md/INTERACTIONS` :

  * `topic: Sprint S<N> — validation prod`
  * `ask:` étapes de test **simples et vérifiables**
  * `context:` env/URL utiles
* Le PO répond **OK/KO** ; ChatGPT adapte backlog (fix/Spillover) et capacité du sprint suivant (vélocité).

## 6) Dérogations

Toute dérogation (scope, qualité, sécurité) doit être notée dans `/docs/sprints/S<N>/REVIEW.md` **et** ajoutée en **improvement** dans `PO_NOTES.md/RETRO`.
