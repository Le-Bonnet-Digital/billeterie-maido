# PLAN — Sprint S10

## 1) Métadonnées

- **Sprint**: S10
- **Timebox**: 25 min (gel **T+22**)
- **Branche**: `work`
- **PR fin de sprint**: `work → main` (titre `Sprint S10: …`)

## 2) Capacité & vélocité

- **Vélocité de référence** (moy. 3 derniers): 7.7
- **Capacité engagée (SP)** = floor(vélocité × 0.8): 6
- **Buffer improvements (\~10%)**: 1

## 3) Sélection des US (commit du sprint)

> Déplacer ces US en `Selected` dans `BACKLOG.md` et renseigner `sprint: 10`.

| ID     | Title             | Type    | SP  | Owner initial | Notes              |
| ------ | ----------------- | ------- | --- | ------------- | ------------------ |
| US-201 | Parcourir offres  | feature | 1   | frontend      | catalogue          |
| US-202 | Panier + CGV      | feature | 1   | frontend      | panier             |
| US-203 | Paiement Stripe   | feature | 3   | serverless    | webhook idempotent |
| US-204 | Validation billet | feature | 1   | serverless    | scan QR            |

**Total SP sélectionnés**: 6 / **Capacité**: 6

## 4) Stratégie & plan d’exécution

- **Gate 0 — Préflight**: `PREFLIGHT.md` (audit code+BDD, `schema.sql` RefreshedAt|unchanged)
- **A — Serverless**: contrats/DTO, handlers, idempotence, tests unit/integration
- **B — Data**: migrations+rollback, tests RLS/policies, index/constraints
- **C — Front**: pages, état loading/empty/error/success, Lighthouse ≥ 90
- **D — QA**: E2E happy + 2 erreurs, charge ciblée si critique

## 5) Risques & mitigations

- R1: … → Mitigation: …
- R2: … → Mitigation: …

## 6) Dépendances & actions PO

- **Secrets/API**: … (PO met à jour `.env.local`)
- **Migrations**: _documentées par l’agent_, **appliquées par le PO après merge**
- **Seed/fixtures**: commande fournie par l’agent (PO exécute si demandé)

## 7) Timeline du sprint

- **T+00**: Plan + Préflight
- **T+10**: Checkpoint mi‑parcours (risques/Spillover potentiels)
- **T+22**: Gel — compléter `DEMO.md`, `REVIEW.md`, `RETRO.md`, `INTERACTIONS.yaml`
- **T+25**: PR unique `work → main`

## 8) Definition of Done (rappel)

- CI locale verte, coverage ≥ 80% (lignes nouvelles)
- Quality Gates 0/A/B/C/D/S OK
- Sécurité: no secrets, RLS testées, idempotence
- Docs sprint à jour + entrée `INTERACTIONS.yaml`
