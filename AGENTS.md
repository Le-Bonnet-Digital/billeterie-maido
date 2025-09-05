# AGENTS.md — Billeterie Maïdo (MVP serverless, sprint timebox 25 min)

## 0) Objet

Manuel d’exécution pour **ChatGPT**. À la commande **« Passe au sprint suivant »**, ChatGPT crée son environnement isolé **sur la branche `work`**, lit ce fichier et exécute **un sprint timeboxé 25 minutes** en jouant tous les rôles (PM, SM, Serverless/Backend, Data, Front, QA, Code Review). 👉 **Aucune autre branche ni environnement** ne doit être créé.

---

## 1) Contrats d’exécution

- **Branche** : unique, `work`.
- **PR** : **une seule PR en fin de sprint** → `work → main`, titre : `Sprint S<N>: <résumé>`.
- **Timebox** : 25 min (gel **T+22** pour docs/review/rétro/PO_NOTES).
- **Autonomie produit** : si besoin, ChatGPT **propose, crée et sélectionne** des US (MVP + qualité irréprochable).
- **Rôle du PO** : fournit **OK/KO**, **secrets/clé API**, **orientations** dans `PO_NOTES.md`.
- **Qualité** : respecter [QUALITY-GATES.md](QUALITY-GATES.md) et [DoD.md](DoD.md).
- **Sécurité** : pas de secrets en repo ; idempotence ; **RLS/policies** testées ; en‑têtes sécurité ; rate‑limit endpoints publics.
- **Garde‑fous locaux** : tout commit doit passer le **hook Husky** `.husky/pre-commit`. Aucune dépendance à GitHub Actions.

---

## 2) Mode Sprint (commande : « Passe au sprint suivant »)

1. **Bootstrap & minuteur**
   - Démarrer un **minuteur 25 min** (checkpoints **T+10**, **T+22**).
   - Créer `/docs/sprints/S<N>/` si absent et initialiser : `PLAN.md`, `BOARD.md`, `DEMO.md`, `REVIEW.md`, `RETRO.md`, `PREFLIGHT.md`, `INTERACTIONS.yaml` (depuis templates).

2. **Pré‑vol (audit existant) → `PREFLIGHT.md`**
   - **Code** : cartographier endpoints/contrats/tests, relever doublons, **code mort**, dette bloquante ; proposer refactors **≤ timebox**.
   - **BDD** : état schéma/migrations/RLS/fonctions ; exiger snapshot **`schema.sql`** (ou `unchanged` justifié). Le PO applique les migrations validées.

3. **Intégrer review & rétro (apprentissage)** :
   - Lire `PO_NOTES.md` & `RETRO.md` ; ajuster pratiques.
   - Consulter `docs/sprints/S<N-1>/INTERACTIONS.yaml` :
     - US `Delivered` validées par le PO → passer en `Done`.
     - Corrections demandées → créer les US de fix et ajuster le backlog/capacité.
     - Ce fichier prévaut sur `REVIEW.md` pour l'état des US ; en cas de `reply: KO`, laisser l'US en `Delivered`.
4. **Collecte & grooming automatique**
   - Lire `BACKLOG.md` (`Ready`) et `PO_NOTES.md`.
   - **Si aucune US `Ready`** :
     - 1. `PO_NOTES.md` (NEW_FEATURES) → **générer** des US ;
     - 2. si vide : **discovery produit** alignée MVP, consigner idées, puis **créer** les US.

   - Toute US auto‑générée : `id,title,value,priority,type`, **≥2 AC**, **note sécurité/RLS**, `links.api` **placeholder**, `origin: auto`, `status: Ready`.

5. **Estimation & capacité**
   - `sp ∈ {1,2,3,5,8,13}` ; **vélocité** = moyenne `delivered_sp` (3 derniers, défaut 8) ; **capacité** = floor(vel×0.8) ; réserver ≈10 % aux **improvements**.

6. **Planification**
   - Sélectionner des US jusqu’à la capacité ; marquer `Selected`, `sprint: N`, `sp` dans `BACKLOG.md` et `/docs/sprints/S<N>/PLAN.md`. Initialiser `BOARD.md`.

7. **Exécution (A→B→C→D), sans PR intermédiaire**
   - Par US : `Selected → InSprint → Delivered` en passant les **gates** :
     - **Gate 0 — Préflight** (code+BDD, `schema.sql`).
     - **Gate A — Serverless/Backend**.
     - **Gate B — Data**.
     - **Gate C — Front**.
     - **Gate D — QA**.

   - Mettre à jour `owner` (serverless→data→frontend→qa) et `BOARD.md`. Déplacer en `Spillover` si dépassement.

8. **Checkpoint T+22 (gel)** : figer code ; compléter `DEMO.md`, `REVIEW.md`, `RETRO.md`, finaliser `PREFLIGHT.md` ; renseigner `INTERACTIONS.yaml` (tests prod).
9. **Clôture & PR unique** : calculer `committed_sp` vs `delivered_sp`, consigner la **vélocité** dans `REVIEW.md` et `SPRINT_HISTORY` ; ouvrir **une PR** `work→main` `Sprint S<N>: …`. Après merge, les US restent en `Delivered` jusqu'à validation PO ; elles passeront en `Done` au sprint suivant.

---

## 3) Backlog — statuts & schéma US

- `status`: `Ready | Selected | InSprint | Delivered | Done | Spillover`
  - `Delivered` : implémenté, QA OK, PR ouverte/mergée en attente validation PO.
  - `Done` : validé par le PO après merge et tests.
- `owner`: `serverless | data | frontend | qa`
- `sp`: `1|2|3|5|8|13` ; `sprint`: `<N|null>`
- `type`: `feature | improvement | fix` ; `origin`: `po | auto`
- `links.api`: contrat d’API/DTO (placeholder accepté pour `origin: auto`)

> **Pré‑vol obligatoire** avant implémentation ; `schema.sql` **à jour** ou `unchanged` justifié.

---

## 4) Garde‑fous **locaux** (pre‑commit)

Avant **tout commit**, le hook **`.husky/pre-commit`** doit réussir. Il vérifie :

1. Présence des artefacts sprint : `/docs/sprints/S<N>/{PLAN.md, BOARD.md, DEMO.md, REVIEW.md, RETRO.md, PREFLIGHT.md, INTERACTIONS.yaml}`.
2. `PREFLIGHT.md` contient **Code audit**, **DB audit**, et **schema.sql RefreshedAt (ISO)** ou **`unchanged`** justifié.
3. `INTERACTIONS.yaml` contient une entrée **Sprint S<N>** (tests prod à exécuter).
4. `BACKLOG.md` :
   - US `origin: auto` en `Delivered` ou `Done` → **`links.api`** présent, **≥2 AC**, **note sécurité/RLS**.
   - US `Delivered` ou `Done` → `sp` et `type` présents.

5. Si des **migrations** sont modifiées → `schema.sql` est mis à jour, **ou** `PREFLIGHT.md` justifie `unchanged`. ⚠️ **ChatGPT ne les applique pas**, le PO exécute les commandes fournies.

---

## 5) Rôles & switching (rappel)

- ChatGPT joue **tous les rôles techniques** ; le **PO** valide et fournit secrets/orientations.
- Ordre par US : **Gate 0** → **A (serverless)** → **B (data)** → **C (front)** → **D (qa)** ; `owner` reflète le rôle courant.

---

## 6) Journal PO & décisions

- À chaque sprint, **ChatGPT** ajoute une entrée **horodatée** dans `/docs/sprints/S<N>/INTERACTIONS.yaml` :
  - `topic: Sprint S<N> — validation prod`
- `ask:` étapes de test simples
- `context:` env/URL utiles

- Le PO répond **OK/KO** (sans horodatage) ; ChatGPT ajuste le backlog (fix/Spillover) et la capacité du sprint suivant (vélocité).
  - Les réponses du PO dans `INTERACTIONS.yaml` font foi et priment sur `REVIEW.md` ou tout autre artefact.

---

## 7) Dérogations

Toute dérogation (scope, qualité, sécurité) doit être :

- mentionnée dans `/docs/sprints/S<N>/REVIEW.md`, et
- ajoutée en **improvement** dans `/docs/sprints/S<N>/RETRO.md` avec action corrective planifiée.
