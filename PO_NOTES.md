# PO_NOTES — Billeterie Maïdo (minimal)

> **Usage**
>
> - **ChatGPT** écrit ici seulement les **instructions stables** et un **en‑tête de sprint**.
> - Les **interactions détaillées** sont stockées **par sprint** dans `/docs/sprints/S<N>/INTERACTIONS.yaml`.

---

## 1) INSTRUCTIONS (pour ChatGPT)

- Sprint **timebox 25 min** (gel **T+22**), **branche `work`**, **PR unique** fin de sprint.
- Réponses concises privilégiées : l’agent fournit directement les livrables attendus (code, plans, rapports) sans explications superflues, sauf si demandé.
- Artefacts sprint à tenir à jour : `/docs/sprints/S<N>/{PLAN.md, BOARD.md, DEMO.md, REVIEW.md, RETRO.md, PREFLIGHT.md, INTERACTIONS.yaml}`.
- **Journal d’interaction** :
  - Chaque entrée ajoutée par ChatGPT doit suivre le gabarit ci-dessous à la lettre (mêmes champs, même ordre). En particulier, `topic` doit commencer par "Sprint S<N>" exactement, et `status: pending` pour déclencher la revue du PO.
  - Écrire dans `INTERACTIONS.yaml` une **entrée horodatée** avec : `did` (fait/livré), `ask` (tests prod PO), `context` (URLs, comptes de test), `status: pending`.
  - Le **PO** répond **dans le même fichier** (`who: PO`, `reply: OK|KO`, `details`).
  - En cas de reprise du développement, se fier au **dernier** `INTERACTIONS.yaml` (PO), qui prime sur `REVIEW.md` ou tout autre artefact.

- **Seeds & fixtures** : ChatGPT **génère/maintient** les scripts/fixtures et fournit **une commande** (ex. `npm run seed`, `dotnet run --project tools/Seeder`, `psql -f seed.sql`). Le PO **exécute la commande** si demandé.
- **Migrations & schéma** : ChatGPT **propose** les migrations et documente les commandes. Le **PO** les **applique** si validées. `schema.sql` est **rafraîchi par le PO** ou noté `unchanged` (justifié) dans `PREFLIGHT.md`.

---

## 2) ACTIONS_PO (à exécuter seulement si listé par ChatGPT)

(ChatGPT liste ces actions sans les exécuter, le PO les réalise après coup.)

- **Secrets/API** : mettre à jour `.env.local` (ex: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MAIL_API_KEY`, …)
- **Snapshot schéma** :
  - Supabase/Postgres

    ```powershell
    supabase db dump --schema public -f schema.sql
    ```

  - SQL Server

    ```powershell
    sqlpackage /Action:Export /SourceConnectionString:"<...>" /TargetFile:schema.sql
    ```

- **Seed** : lancer la commande fournie (ex. `npm run seed`, `dotnet run --project tools/Seeder`, `psql -f seed.sql`).
- **Appliquer les migrations DB** (selon commandes documentées) **après merge** si nécessaire.

---

## 3) SPRINT — EN‑TÊTE (renseigné par ChatGPT)

```yaml
sprint_id: 9
highlights: |
  - Objectif "valeur ajoutée client" (Stripe, Auth & RLS, capacité créneaux)
  - Automatiser la génération de docs
  - Filtre des offres par activité
risks_or_todo: |
  - Sur-engagement (20 SP > vélocité récente)
  - Automatiser la génération de docs
interaction_log: ./docs/sprints/S9/INTERACTIONS.yaml
status: pending
```

(ChatGPT renseigne ce YAML dès le début du sprint, avec le bon sprint_id, les highlights du plan courant et les risques identifiés.)

---

## Gabarit — `/docs/sprints/S<N>/INTERACTIONS.yaml`

```yaml
- who: ChatGPT
  when: 2025-09-04T15:00:00+02:00
  topic: Sprint S<N> — validation prod
  did: |
    - Implémenté : …
    - Gates passées : …
  ask: |
    Tester en prod :
    1) …
    2) …
  context: env: https://stage.example.app ; PR: Sprint S<N>
  status: pending

- who: PO
  topic: Sprint S<N> — validation prod
  reply: OK | KO
  details: "…"
  action: none | fix
```

> Les **hooks Husky** exigent que `INTERACTIONS.yaml` existe, soit **stagé**, et référence `topic: Sprint S<N>`.

---

## RETRO

- IMP-03: automatiser la vérification des interactions (responsable: ChatGPT, sprint cible: S5)
- IMP-04: étendre le script de seed aux activités poney/tir à l'arc (responsable: data, sprint cible: S6)
- IMP-05: documenter la création d'utilisateurs de test (responsable: data, sprint cible: S6)
- IMP-06: Réduire les délais d’attente en automatisant la validation du plan (responsable: ChatGPT, sprint cible: S10)
