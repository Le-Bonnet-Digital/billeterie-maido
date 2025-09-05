# PLAN — Sprint S9

## 1) Métadonnées

- **Sprint**: S9
- **Timebox**: 25 min (gel **T+22**)
- **Branche**: `work`
- **PR fin de sprint**: `work → main` (titre `Sprint S<N>: …`)

## 2) Capacité & vélocité

- **Vélocité de référence** (moy. 3 derniers): 8
- **Capacité engagée (SP)** = floor(vélocité × 0.8): 20
- **Buffer improvements (\~10%)**: 2

## 3) Sélection des US (commit du sprint)

> Déplacer ces US en `Selected` dans `BACKLOG.md` et renseigner `sprint: N`.

| ID     | Title                                | Type        | SP  | Owner initial | Notes                        |
| ------ | ------------------------------------ | ----------- | --- | ------------- | ---------------------------- |
| US-00  | Paiement Stripe + webhook idempotent | feature     | 5   | serverless    | Stripe checkout + webhook    |
| US-01  | Auth & Rôles + RLS de base           | feature     | 5   | data          | Rôles JWT + policies         |
| US-02  | Capacité & créneaux atomiques        | feature     | 5   | data          | Réservation transactionnelle |
| IMP-07 | Automatiser la génération de docs    | improvement | 2   | qa            | Script docgen                |
| US-104 | Filtrer les offres par activité      | feature     | 3   | frontend      | Filtre UI                    |

**Total SP sélectionnés**: 20 / **Capacité**: 20

## 4) Stratégie & plan d’exécution

- **Gate 0 — Préflight**: `PREFLIGHT.md` (audit code+BDD, `schema.sql` RefreshedAt|unchanged)
- **A — Serverless**: contrats/DTO, handlers, idempotence, tests unit/integration
- **B — Data**: migrations+rollback, tests RLS/policies, index/constraints
- **C — Front**: pages, état loading/empty/error/success, Lighthouse ≥ 90
- **D — QA**: E2E happy + 2 erreurs, charge ciblée si critique

## 5) Risques & mitigations

- R1: Sur-engagement (20 SP) → Mitigation: réévaluer à T+10
- R2: Docgen non automatisé → Mitigation: suivre IMP-07

## 6) Dépendances & actions PO

- **Secrets/API**: aucune nouvelle clé
- **Migrations**: documentées, appliquées par le PO après merge
- **Seed/fixtures**: commande fournie si nécessaire

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
