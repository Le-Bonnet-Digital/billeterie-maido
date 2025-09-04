# QUALITY-GATES — Billeterie Maïdo

## Gate 0 — Préflight (code + BDD)

* [ ] `/docs/sprints/S<N>/PREFLIGHT.md` rempli
* [ ] Doublons / code mort recensés, décisions prises (suppr/refactor)
* [ ] DB audit complété (tables, RLS, fonctions, migrations envisagées)
* [ ] `schema.sql RefreshedAt` ou `unchanged` **justifié**

## Gate A — Serverless/Backend

* [ ] Contrats d’API/DTO (validation d’entrée)
* [ ] Idempotence (webhooks/validations)
* [ ] Tests unitaires/intégration verts
* [ ] Logs structurés, pas de PII

## Gate B — Data

* [ ] Migrations versionnées + rollback
* [ ] **RLS** testées par rôle (fixtures)
* [ ] Index/constraints OK
* [ ] Fonctions SQL atomiques + tests de concurrence

## Gate C — Front

* [ ] UI responsive, i18n si prévu
* [ ] Lighthouse a11y & perf ≥ 90
* [ ] États loading/empty/error/success complets
* [ ] VRT OK, intégration contrats

## Gate D — QA/E2E

* [ ] E2E (happy + 2 erreurs)
* [ ] Tests rôle/RLS ; charge ciblée si critique
* [ ] `QA_CHECKLIST.md` coché

## Sprint (timebox 25 min)

* [ ] `PLAN.md` (capacité & SP)
* [ ] `BOARD.md` à jour (Selected → InSprint → Done → Spillover)
* [ ] `DEMO.md`, `REVIEW.md`, `RETRO.md` présents
* [ ] `PO_NOTES.md/INTERACTIONS` contient l’entrée **S<N>** (tests prod)
