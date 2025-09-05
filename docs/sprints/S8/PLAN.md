# PLAN — Sprint S8

## 1) Métadonnées

- **Sprint**: S8
- **Timebox**: 25 min (gel **T+22**)
- **Branche**: `work`
- **PR fin de sprint**: `work → main` (titre `Sprint S8: paiement & RLS`)

## 2) Capacité & vélocité

- **Vélocité de référence** (moy. 3 derniers): 7
- **Capacité engagée (SP)** = 20 (override PO)
- **Buffer improvements (~10%)**: 2

## 3) Sélection des US (commit du sprint)

> Déplacer ces US en `Selected` dans `BACKLOG.md` et renseigner `sprint: 8`.

| ID     | Title                                | Type        | SP  | Owner initial | Notes |
| ------ | ------------------------------------ | ----------- | --- | ------------- | ----- |
| US-00  | Paiement Stripe + webhook idempotent | feature     | 5   | serverless    |       |
| US-01  | Auth & Rôles + RLS de base           | feature     | 5   | data          |       |
| US-02  | Capacité & créneaux atomiques        | feature     | 5   | data          |       |
| IMP-06 | Mesurer la vélocité réelle           | improvement | 3   | qa            |       |
| IMP-07 | Automatiser la génération de docs    | improvement | 2   | qa            |       |

**Total SP sélectionnés**: 20 / **Capacité**: 20

## 4) Stratégie & plan d’exécution

- **Gate 0 — Préflight**: `PREFLIGHT.md` (audit code+BDD, `schema.sql` unchanged)
- **A — Serverless**: contrats/DTO, handlers, idempotence, tests unit/integration
- **B — Data**: migrations+rollback, tests RLS/policies, index/constraints
- **C — Front**: pages, état loading/empty/error/success, Lighthouse ≥ 90
- **D — QA**: E2E happy + 2 erreurs, charge ciblée si critique

## 5) Risques & mitigations

- R1: Complexité RLS → Mitigation: tests automatisés
- R2: Intégration Stripe → Mitigation: webhook en mode test

## 6) Dépendances & actions PO

- **Secrets/API**: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- **Migrations**: documentées, appliquées par le PO après merge
- **Seed/fixtures**: commande `npm run seed` si nécessaire

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
