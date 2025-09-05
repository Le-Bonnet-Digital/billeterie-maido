# PO_NOTES — Billeterie Maïdo (minimal)

> **Usage**
>
> - **ChatGPT** écrit ici seulement les **instructions stables** et un **en‑tête de sprint**.
> - Les **interactions détaillées** sont stockées **par sprint** dans `/docs/sprints/S<N>/INTERACTIONS.yaml`.

---

## 1) INSTRUCTIONS (pour ChatGPT)

- Sprint **timebox 25 min** (gel **T+22**), **branche `work`**, **PR unique** fin de sprint.
- Artefacts sprint à tenir à jour : `/docs/sprints/S<N>/{PLAN.md, BOARD.md, DEMO.md, REVIEW.md, RETRO.md, PREFLIGHT.md, INTERACTIONS.yaml}`.
- **Journal d’interaction** :
  - Écrire dans `INTERACTIONS.yaml` une **entrée horodatée** avec : `did` (fait/livré), `ask` (tests prod PO), `context` (URLs, comptes de test), `status: pending`.
  - Le **PO** répond **dans le même fichier** (`who: PO`, `reply: OK|KO`, `details`).
  - En cas de reprise du développement, se fier au **dernier** `INTERACTIONS.yaml` (PO), qui prime sur `REVIEW.md` ou tout autre artefact.

- **Seeds & fixtures** : ChatGPT **génère/maintient** les scripts/fixtures et fournit **une commande** (ex. `npm run seed`, `dotnet run --project tools/Seeder`, `psql -f seed.sql`). Le PO **exécute la commande** si demandé.
- **Migrations & schéma** : ChatGPT **propose** les migrations et documente les commandes. Le **PO** les **applique** si validées. `schema.sql` est **rafraîchi par le PO** ou noté `unchanged` (justifié) dans `PREFLIGHT.md`.

---

## 2) ACTIONS_PO (à exécuter seulement si listé par ChatGPT)

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
sprint_id: 3
highlights: |
  - Migration guaranteed_runs ajoutée
risks_or_todo: |
  - Tests RLS prestataires à compléter
interaction_log: ./docs/sprints/S3/INTERACTIONS.yaml
status: wip
```

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
