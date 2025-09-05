# PLAN — Sprint S7

## 1) Métadonnées

- **Sprint**: S7
- **Timebox**: 25 min (gel **T+22**)
- **Branche**: `work`
- **PR fin de sprint**: `work → main` (titre `Sprint S7: utilitaires front`)

## 2) Capacité & vélocité

- **Vélocité de référence** (moy. 3 derniers): 25
- **Capacité engagée (SP)** = floor(vélocité × 0.8): 20
- **Buffer improvements (~10%)**: 2

## 3) Sélection des US (commit du sprint)

> Déplacer ces US en `Selected` dans `BACKLOG.md` et renseigner `sprint: 7`.

| ID     | Title                 | Type        | SP  | Owner initial | Notes |
| ------ | --------------------- | ----------- | --- | ------------- | ----- |
| US-100 | Utilitaire parsePrice | improvement | 5   | frontend      |       |
| US-101 | Utilitaire formatDate | improvement | 5   | frontend      |       |
| US-102 | Utilitaire slugify    | improvement | 5   | frontend      |       |
| US-103 | Utilitaire clamp      | improvement | 5   | frontend      |       |

**Total SP sélectionnés**: 20 / **Capacité**: 20

## 4) Stratégie & plan d’exécution

- **Gate 0 — Préflight**: `PREFLIGHT.md` (audit code+BDD, `schema.sql` RefreshedAt|unchanged)
- **A — Serverless**: n/a
- **B — Data**: n/a
- **C — Front**: utilitaires JS avec tests unitaires
- **D — QA**: exécution `npm test`

## 5) Risques & mitigations

- R1: manque de temps → Mitigation: se limiter à des utilitaires simples
- R2: régressions inattendues → Mitigation: couvrir par tests unitaires

## 6) Dépendances & actions PO

- **Secrets/API**: néant
- **Migrations**: n/a
- **Seed/fixtures**: n/a

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
