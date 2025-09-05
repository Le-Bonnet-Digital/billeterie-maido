# QUALITY-GATES — Billeterie Maïdo

> **But** : critères de passage obligatoires par gate. Chaque case **doit être cochée** avant de passer à la suivante. Les preuves sont référencées dans `/docs/sprints/S<N>/*`.

---

## Gate 0 — Préflight (code + BDD)

**Objectif** : vérifier l’existant et figer le plan minimal.

- [ ] `/docs/sprints/S<N>/PREFLIGHT.md` rempli (sections 1→8)
- [ ] **Code audit** : doublons / code mort listés + décision (supprimer/refactor ≤ timebox)
- [ ] **DB audit** : tables/colonnes, RLS/policies, fonctions, **écarts** et migrations envisagées
- [ ] **`schema.sql`** : `RefreshedAt` (ISO) **ou** `unchanged` **justifié**
- [ ] **Plan d’action** (nettoyages/refactors ≤ timebox) défini

**Preuves** : `PREFLIGHT.md` ; diff `schema.sql` si rafraîchi

---

## Gate A — Serverless/Backend

**Objectif** : contrats stables, logique robuste, idempotence.

- [ ] Contrats d’API/DTO (validation entrée – Zod/FluentValidation) + erreurs normalisées
- [ ] Idempotence (webhooks/validations) + déduplication
- [ ] Tests **unitaires & intégration** verts (incl. erreurs)
- [ ] Logs structurés (correlation id), pas de PII

**Preuves** : fichiers contrats, tests, extraits logs / README section API

---

## Gate B — Data

**Objectif** : intégrité & sécurité des données.

- [ ] **Migrations** versionnées + scripts de rollback
- [ ] **RLS/policies** testées par rôle (fixtures auto/seed)
- [ ] Index/constraints en place (PK/UK/FK, unique, check)
- [ ] Fonctions SQL atomiques + **tests de concurrence** (verrouillage / sérialisation)

**Preuves** : migrations, tests RLS/concurrence, `schema.sql` ou justification

---

## Gate C — Front

**Objectif** : UX accessible et performante.

- [ ] UI responsive ; i18n si prévu ; états `loading/empty/error/success`
- [ ] Lighthouse **a11y & perf ≥ 90** (capture rapport)
- [ ] VRT OK (si configuré) ; intégration contrats (types sûrs)

**Preuves** : captures Lighthouse, snapshots VRT, checklists a11y

---

## Gate D — QA / E2E

**Objectif** : valider le flux bout‑en‑bout et les garde‑fous sécurité.

- [ ] E2E **happy path** + **≥ 2 cas d’erreur** critiques
- [ ] Tests rôle/RLS ; **charge ciblée** si endpoint critique
- [ ] `QA_CHECKLIST.md` coché

**Preuves** : rapports tests (E2E/charge), `QA_CHECKLIST.md`

---

## Gate S — Clôture Sprint (timebox 25 min)

**Objectif** : livrer, documenter, préparer la validation PO et la rétro.

- [ ] `PLAN.md` (capacité & SP) à jour
- [ ] `BOARD.md` à jour (`Selected → InSprint → Delivered → Spillover`)
- [ ] `DEMO.md`, `REVIEW.md`, `RETRO.md` présents et complétés à **T+22**
- [ ] `/docs/sprints/S<N>/INTERACTIONS.yaml` contient l’entrée **Sprint S<N>** (tests prod)
- [ ] `CHANGELOG.md` **\[Unreleased]** mis à jour

**Preuves** : fichiers sprint, `INTERACTIONS.yaml`

---

## Conditions d’échec (bloquantes pre‑commit)

- Une des cases ci‑dessus non cochée → **commit bloqué** par `.husky/pre-commit`
- US `origin: auto` en `Delivered` **sans** `links.api` **ou** **< 2 AC** **ou** **sans note sécurité/RLS** → **commit bloqué**
- Migrations modifiées **sans** mise à jour de `schema.sql` **et sans** justification `unchanged` dans `PREFLIGHT.md` → **commit bloqué**
