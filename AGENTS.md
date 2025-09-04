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
   * Créer `/docs/sprints/S<N>/` si absent et initialiser : `PLAN.md`, `BOARD.md`, `DEMO.md`, `REVIEW.md`, `RETRO.md`, `PREFLIGHT.md`.

2. **Pré-vol (audit existant – code + BDD)**

   * Compléter `/docs/sprints/S<N>/PREFLIGHT.md` avec :

     * Audit **code** : doublons, code mort, TODO/FIXME, refactor minimal.
     * Audit **BDD** : tables, RLS, fonctions, écarts vs besoins.
     * `schema.sql` rafraîchi (ou marqué `unchanged` justifié).
   * Si migrations modifiées → exiger `schema.sql` mis à jour ou justification dans `PREFLIGHT.md`.

3. **Intégrer review & rétro**

   * Lire `PO_NOTES.md` → `SPRINT_HISTORY` & `RETRO/improvements`, ajuster pratiques.

4. **Collecte & grooming automatique**

   * Lire `BACKLOG.md`, `PO_NOTES.md/SPRINT_INPUT`, `README.md`, `DoD.md`, `QUALITY-GATES.md`.
   * **Si aucune US `Ready`** : générer depuis `PO_NOTES.md/NEW_FEATURES` ou discovery produit.
   * US auto-générées : **≥2 AC**, note sécurité/RLS, `links.api` placeholder, `origin: auto`.

5. **Estimation & capacité**

   * Estimer en SP (`1|2|3|5|8|13`).
   * **Capacité** = vélocité × 0.8, +10% improvements.

6. **Planification**

   * Sélectionner US jusqu’à capacité ; MAJ `BACKLOG.md` et `/docs/sprints/S<N>/PLAN.md`.
   * Initialiser `BOARD.md`.

7. **Exécution (A→B→C→D)**

   * US avancent `Selected → InSprint → Done`.
   * Gates :

     * **Gate A** : API/DTO, idempotence, tests unit/intégration, logs.
     * **Gate B** : migrations, RLS testées, contraintes, tests concurrence.
     * **Gate C** : UI responsive, Lighthouse ≥90, états complets, VRT.
     * **Gate D** : E2E (happy + 2 erreurs), tests rôle/RLS, QA\_CHECKLIST.
   * Nettoyage identifié en pré-vol → appliqué si safe, sinon US `improvement`.
   * Dépassement : basculer en `Spillover`.

8. **Checkpoint T+22 (gel)**

   * Geler le code, compléter `DEMO.md`, `REVIEW.md`, `RETRO.md`, finaliser `PREFLIGHT.md`.
   * Renseigner `PO_NOTES.md/INTERACTIONS` (tests prod pour validation).

9. **Clôture & PR unique**

   * Calculer SP commit/delivered ; MAJ `SPRINT_HISTORY`.
   * Ouvrir une PR `work → main` (`Sprint S<N>: …`).
   * Après merge : marquer US en `Merged`.

## 3) Backlog — statuts & schéma US

* `status`: `Ready | Selected | InSprint | Done | Spillover | Merged`
* `owner`: `serverless | data | frontend | qa`
* `sp`: `1|2|3|5|8|13`
* `sprint`: `<N|null>`
* `type`: `feature | improvement | fix`
* `origin`: `po | auto`
* `links.api`: contrat d’API/DTO (placeholder si auto)

> **Préflight obligatoire** : avant toute implémentation, vérifier l’existant (code + BDD), documenter dans `PREFLIGHT.md`, assurer `schema.sql` à jour (ou justifié).

## 4) Garde-fous (hook local)

Avant tout commit, le hook **`.githooks/pre-commit.ps1`** doit passer. Il bloque si :

* Artefacts sprint manquants (PLAN/BOARD/DEMO/REVIEW/RETRO/PREFLIGHT).
* `PO_NOTES.md` sans INTERACTION pour Sprint S<N>.
* `BACKLOG.md`: US `origin: auto` en `Done` incomplètes (pas de `links.api`, <2 AC, pas de note sécurité/RLS).
* Migrations modifiées sans `schema.sql` mis à jour ni justification `unchanged`.

## 5) Journal PO & décisions

* Chaque sprint → entrée horodatée dans `PO_NOTES.md/INTERACTIONS` :

  * `topic: Sprint S<N> — validation prod`
  * `ask:` tests prod
  * `context:` env/URL
* PO répond **OK/KO** ; ChatGPT ajuste backlog et vélocité.

## 6) Dérogations

Dérogations (scope, qualité, sécurité) : notées dans `REVIEW.md` + ajoutées en `RETRO` (improvements).
