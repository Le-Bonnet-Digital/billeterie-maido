# PO\_NOTES — Billeterie Maïdo (minimal)

> **But** : instructions stables pour ChatGPT + un en‑tête très court du sprint courant.
> **Les interactions détaillées sont stockées **par sprint** dans `/docs/sprints/S<N>/INTERACTIONS.yaml`.

---

## 1) INSTRUCTIONS (pour ChatGPT)

* Sprint **timebox 25 min** (gel **T+22**), **branche `work`**, **PR unique** fin de sprint.
* Toujours préparer/tenir à jour les artefacts `/docs/sprints/S<N>/` : `PLAN.md`, `BOARD.md`, `DEMO.md`, `REVIEW.md`, `RETRO.md`, `PREFLIGHT.md`, **`INTERACTIONS.yaml`**.
* **Journal d’interaction** :

  * Écrire dans `/docs/sprints/S<N>/INTERACTIONS.yaml` une **entrée horodatée** (voir gabarit ci‑dessous) avec :

    * `did` (ce qui a été fait/livré),
    * `ask` (tests prod simples pour PO),
    * `context` (URLs, identifiants de test si besoin), `status: pending`.
  * Le **PO** répond **dans le même fichier** avec une nouvelle entrée (`who: PO`, `reply: OK|KO`, `details`).
* **ACTIONS\_PO** : lister ci‑dessous (dans cette page) **uniquement** les actions manuelles à exécuter (secrets, snapshot `schema.sql`, lancer un script de seed). Tout le reste est **automatisé par ChatGPT** (grooming, selection US, seeds/fixtures, etc.).

---

## 2) ACTIONS\_PO (renseigné par ChatGPT si nécessaire)

> Le PO exécute seulement ce qui est listé ici.

* **Secrets/API** : mettre à jour `.env.local` (ex: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MAIL_API_KEY`, …)
* **Snapshot schéma** :

  * Supabase/Postgres

    ```powershell
    supabase db dump --schema public -f schema.sql
    ```
  * SQL Server

    ```powershell
    sqlpackage /Action:Export /SourceConnectionString:"<...>" /TargetFile:schema.sql
    ```
* **Jeux de données / Seed** : utiliser la commande fournie par ChatGPT (ex. `npm run seed`, `dotnet run --project tools/Seeder`, `psql -f seed.sql`).

---

## 3) SPRINT COURANT — EN‑TÊTE (renseigné par ChatGPT)

```yaml
sprint_id: <N>
highlights: |
  - …
risks_or_todo: |
  - …
interaction_log: ./docs/sprints/S<N>/INTERACTIONS.yaml
status: pending | waiting_PO | done
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
  when: 2025-09-04T16:20:00+02:00
  topic: Sprint S<N> — validation prod
  reply: OK | KO
  details: "…"
  action: none | fix
```
