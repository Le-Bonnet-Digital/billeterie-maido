# PLAN — Sprint S1

## 1) Métadonnées

- **Sprint**: S1
- **Timebox**: 25 min (gel **T+22**)
- **Branche**: `work`
- **PR fin de sprint**: `work → main` (titre `Sprint S1: …`)

## 2) Capacité & vélocité

- **Vélocité de référence** (moy. 3 derniers): 8
- **Capacité engagée (SP)** = floor(vélocité × 0.8): 6
- **Buffer improvements (\~10%)**: 1

## 3) Sélection des US (commit du sprint)

> Déplacer ces US en `Selected` dans `BACKLOG.md` et renseigner `sprint: N`.

| ID    | Title                     | Type    | SP  | Owner initial | Notes |
| ----- | ------------------------- | ------- | --- | ------------- | ----- |
| US-10 | Parcourir offres & passes | feature | 3   | frontend      |       |
| US-11 | Panier + CGV              | feature | 3   | frontend      |       |

**Total SP sélectionnés**: 6 / **Capacité**: 6

## 4) Stratégie & plan d’exécution

- **Gate 0 — Préflight**: `PREFLIGHT.md` (audit code+BDD, `schema.sql` RefreshedAt|unchanged)
- **A — Serverless**: contrats/DTO, handlers, idempotence, tests unit/integration
- **B — Data**: migrations+rollback, tests RLS/policies, index/constraints
- **C — Front**: pages, état loading/empty/error/success, Lighthouse ≥ 90
- **D — QA**: E2E happy + 2 erreurs, charge ciblée si critique

## 5) Risques & mitigations

- R1: premier sprint, périmètre flou → Mitigation: limiter aux vues client

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
