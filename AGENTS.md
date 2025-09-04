# AGENTS.md — Billeterie Maïdo (MVP serverless)

## Objet

Manuel d’exécution pour **ChatGPT**. Lorsqu’on dit « **Passe au sprint suivant** », ChatGPT crée son environnement isolé **sur la branche `work`**, lit ce fichier, puis exécute **un sprint timeboxé 25 minutes** en jouant les rôles internes (PM, Scrum Master, Serverless/Backend, Data, Front, QA, Code Review). Aucune autre branche ni autre environnement ne doit être créé.

## Contrats d’exécution

* **Branche** : unique, `work`.
* **PR** : **une seule PR** en fin de sprint : `work → main`, titre `Sprint S<N>: <résumé>`.
* **Timebox** : 25 min maximum. **Deadline interne à 22 min** pour figer le code et compléter la doc (review, rétro, PO\_NOTES).
* **Autonomie produit** : ChatGPT **propose, crée et sélectionne les US nécessaires** à l’atteinte du MVP avec **qualité irréprochable**. Il ne dépend pas du PO pour rédiger les US.
* **Rôle du PO** : se limite à fournir **OK/KO**, **secrets/clé API**, et **orientations** dans `PO_NOTES.md`.
* **Qualité** : respecter `QUALITY-GATES.md` et `DoD.md`.
* **Sécurité** : aucun secret en repo ; Stripe webhook **signé** & **idempotent** ; **RLS** testées par rôle ; headers sécurité ; rate‑limit endpoints publics.

## Mode Sprint (commande : « Passe au sprint suivant »)

1. **Bootstrap & minuteur**

   * Démarrer un **minuteur interne** 25 min ; checkpoint à **T+10** et **T+22**.
   * Créer (si absent) le dossier `/docs/sprints/S<N>/` et initialiser les fichiers depuis templates : `PLAN.md`, `BOARD.md`, `DEMO.md`, `REVIEW.md`, `RETRO.md`.
2. **Intégration review & rétro (apprentissage)**

   * Lire `PO_NOTES.md` → `SPRINT_HISTORY` et `RETRO/improvements` ; appliquer les améliorations (met à jour `QUALITY-GATES.md` si nécessaire).
3. **Collecte & grooming automatique**

   * Lire `BACKLOG.md` (US `Ready`), `PO_NOTES.md/SPRINT_INPUT`, `README.md`, `DoD.md`, `QUALITY-GATES.md`.
   * **Si aucune US n’est en `Ready`** :

     * Première source : `PO_NOTES.md/NEW_FEATURES` → **générer** des US.
     * Si `NEW_FEATURES` est vide ou insuffisant : **discovery produit** → proposer des US alignées MVP, consigner dans `PO_NOTES.md/NEW_FEATURES`, puis les **créer** dans `BACKLOG.md`.
     * Chaque US auto‑générée comporte :

       * `id`, `title`, `value`, `priority`, `type` ;
       * **AC minimum (≥ 2)** ;
       * **note sécurité/RLS** ;
       * `links.api` **placeholder** (contrat d’API à compléter) ;
       * `origin: auto`.
   * Marquer ces nouvelles US en `Ready`.
4. **Estimation & capacité**

   * Estimer chaque US en **story points** `sp ∈ {1,2,3,5,8,13}`.
   * Calculer **vélocité** : moyenne des `delivered_sp` des 3 derniers sprints (sinon 8 par défaut).
   * **Capacité engagée** = `floor(vélocité × 0.8)` ; réserver \~10 % aux **improvements**.
5. **Planification sprint**

   * Sélectionner des US jusqu’à la **capacité** ; marquer `status: Selected`, `sprint: N`, `sp: x` dans `BACKLOG.md` et reporter dans `PLAN.md`.
   * Initialiser `BOARD.md` avec `Selected`.
6. **Exécution (A→B→C→D) – sans PR intermédiaire**

   * Avancer chaque US : `Selected` → `InSprint` → `Done`.
   * Passer les **gates** : A (Serverless) → B (Data/RLS) → C (Front) → D (QA/E2E).
   * Mettre à jour `owner` de l’US (serverless→data→frontend→qa) et `/docs/sprints/S<N>/BOARD.md`.
   * Si dépassement : basculer l’US en `Spillover` (report sprint suivant).
7. **Checkpoint T+22 (gel)**

   * **Geler le code**. Compléter `DEMO.md`, `REVIEW.md`, `RETRO.md`.
   * Mettre à jour `PO_NOTES.md/INTERACTIONS` (tests prod à exécuter, horodaté).
8. **Clôture & PR unique**

   * Calculer `committed_sp` vs `delivered_sp` et écrire `SPRINT_HISTORY` dans `PO_NOTES.md`.
   * Ouvrir **une PR** `work → main` : `Sprint S<N>: <résumé>`.
   * Les US livrées passent `Merged` **après** merge de la PR.

## Statuts Backlog & champs US

`status: Ready | Selected | InSprint | Done | Spillover | Merged`  ·  `sp: 1|2|3|5|8|13`  ·  `sprint: <N|null>`  ·  `type: feature|improvement|fix`  ·  `origin: po|auto`

## Garde‑fous (PR ne doit pas passer si…)

* **Bloquants** avant merge :

  1. Présence des fichiers `/docs/sprints/S<N>/{PLAN.md, BOARD.md, DEMO.md, REVIEW.md, RETRO.md}`.
  2. `PO_NOTES.md/INTERACTIONS` contient une entrée horodatée **pour S<N>** avec **tests prod** à exécuter.
  3. `BACKLOG.md` :

     * toute US **livrée** est en `Done` ;
     * toute US **auto‑générée** (`origin: auto`) possède **≥ 2 AC**, une **note sécurité/RLS**, et un **`links.api` placeholder** ;
     * chaque US `Done` a bien un `sp` et un `type`.
  4. `CHANGELOG.md` : une entrée **\[Unreleased]** résume le contenu du sprint.
  5. CI verte (lint, build, tests, Lighthouse si Front), couverture ≥ 80 % des nouvelles lignes.
* Si un garde‑fou manque, **échouer la PR** (`sprint-guard.yml`).

## Qualité attendue (extraits)

* **Gate A — Serverless/Backend** : contrats Zod, validation d’entrée, idempotence (webhooks/validations), tests unit/inté, logs structurés.
* **Gate B — Data** : migrations versionnées + rollback, **RLS** testées par rôle, index/contraintes, fonctions SQL atomiques + tests concurrence.
* **Gate C — Front** : UI responsive, i18n si prévu, Lighthouse a11y & perf ≥ 90, états loading/empty/error/success, VRT OK.
* **Gate D — QA** : E2E (happy + 2 erreurs), tests rôle/RLS, test charge ciblé si critique, `QA_CHECKLIST.md` coché.

## Dérogations

Toute dérogation (scope, qualité, sécurité) doit être notée dans `/docs/sprints/S<N>/REVIEW.md` **et** dans `PO_NOTES.md/RETRO.improvements` avec une action corrective planifiée.
