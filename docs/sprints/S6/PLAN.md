# PLAN — Sprint S6

## 1) Métadonnées

- **Sprint**: S6
- **Timebox**: 25 min (gel **T+22**)
- **Branche**: `work`
- **PR fin de sprint**: `work → main` (titre `Sprint S6: …`)

## 2) Capacité & vélocité

- **Vélocité de référence** (moy. 3 derniers): 2
- **Capacité engagée (SP)** = floor(vélocité × 0.8): 1
- **Buffer improvements (\~10%)**: 0

## 3) Sélection des US (commit du sprint)

> Déplacer ces US en `Selected` dans `BACKLOG.md` et renseigner `sprint: N`.

| ID    | Title                                | Type | SP  | Owner initial | Notes |
| ----- | ------------------------------------ | ---- | --- | ------------- | ----- |
| US-23 | Corriger nommage migrations Supabase | fix  | 1   | data          |       |

**Total SP sélectionnés**: 1 / **Capacité**: 1

## 4) Stratégie & plan d’exécution

- **Gate 0 — Préflight**: `PREFLIGHT.md` (audit code+BDD, `schema.sql` RefreshedAt|unchanged)
- **A — Serverless**: contrats/DTO, handlers, idempotence, tests unit/integration
- **B — Data**: migrations+rollback, tests RLS/policies, index/constraints
- **C — Front**: pages, état loading/empty/error/success, Lighthouse ≥ 90
- **D — QA**: E2E happy + 2 erreurs, charge ciblée si critique

## 5) Risques & mitigations

- R1: Nommage incohérent des migrations → Mitigation: audit et renaming

## 6) Dépendances & actions PO

- **Secrets/API**: néant
- **Migrations**: renommer la migration fautive et en ajouter une pour les validations Luge (appliquées par le PO après merge)
- **Seed/fixtures**: néant

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
