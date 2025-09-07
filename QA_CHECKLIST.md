# QA_CHECKLIST — Billeterie Maïdo

> À cocher avant de passer une US en **Done** et à la clôture du sprint (ChatGPT parcourra cette liste en fin de sprint pour s’assurer d’avoir couvert chaque point ou apporter des preuves dans les artefacts). Les preuves sont stockées dans `/docs/sprints/S<N>/*` et/ou les dossiers de tests.

Les items marqués d’un astérisque (\*) sont non prioritaires pour le MVP s’ils ne sont pas configurés.

---

## 1) Serverless / Backend

- [ ] Contrats d’entrée/sortie à jour (`/src/shared/contracts/*`)
- [ ] Validation entrée (Zod/FluentValidation) + erreurs normalisées
- [ ] Idempotence (webhooks/validations) + déduplication si applicable
- [ ] Tests **unitaires** verts (≥ 2 cas d’erreur)
- [ ] Tests **d’intégration** verts (repository/service/controller)
- [ ] Logs structurés (corrélation), pas de PII

**Preuves** : contrats, spec d’erreurs, rapports tests, extraits logs

---

## 2) Data / Persistant

- [x] Migrations versionnées + **script de rollback**
- [ ] **RLS/policies** testées par rôle (admin, parc, prestataire, customer)
- [ ] Index/contraintes (PK/UK/FK, unique, check) en place
- [ ] Fonctions SQL atomiques + **tests de concurrence** (si concerné)
- [x] `schema.sql` rafraîchi **ou** `PREFLIGHT.md` justifie `unchanged`

**Preuves** : migrations, tests RLS/concurrence, diff `schema.sql`

> ℹ️ Les **migrations ne sont pas appliquées par ChatGPT**. Le PO les applique après merge, selon les commandes documentées.

---

## 3) Front / UX

- [ ] Responsive (desktop/tablette/mobile)
- [ ] États complets : `loading / empty / error / success`
- [ ] i18n si prévu (fr par défaut)
- [ ] **Lighthouse a11y & perf ≥ 90** (capture rapport jointe)\*
- [ ] VRT OK (si configuré)\*
- [ ] Contrats consommés correctement (types sûrs)

**Preuves** : captures Lighthouse, snapshots VRT, story/screenshot

---

## 4) QA / E2E

- [ ] **Happy path** bout‑en‑bout
- [ ] **≥ 2 cas d’erreur** critiques couverts
- [ ] Tests rôle/RLS (accès parc/prestataires/admin)
- [ ] **Charge ciblée** (si endpoint critique)\*

**Preuves** : rapports E2E, charge

---

## 5) Sécurité

- [ ] Aucune **clé/secret** en repo/PR
- [ ] Webhooks **signés** (Stripe) ; vérif signature OK
- [ ] En‑têtes de sécurité (CSP, HSTS, etc. si front public)
- [ ] Données sensibles **non loggées**, masquage si besoin

**Preuves** : config, extraits logs, captures headers

---

## 6) Observabilité

- [ ] Logs structurés (niveau `Information`/`Warning` pertinents)
- [ ] Traces/CorrelationId propagé
- [ ] Métriques clés (si disponibles) : latence, erreurs, tentatives\*

**Preuves** : extraits logs/metrics, doc

---

## 7) Documentation

- [ ] `README` section API/feature mise à jour (si nouvelle API)
- [ ] `/docs/sprints/S<N>/DEMO.md` décrit le scénario de démo
- [ ] `/docs/sprints/S<N>/REVIEW.md` consigne décisions/dérogations
- [ ] `/docs/sprints/S<N>/RETRO.md` liste les improvements

**Preuves** : fichiers sprint, diff README

---

## 8) Release / Changelog

- [x] `CHANGELOG.md` — entrée **\[Unreleased]** renseignée
- [ ] Version/Tag prévu si nécessaire (notes de version courtes)\*

**Preuves** : diff CHANGELOG, release notes

---

## 9) PO Validation (prod/stage)

- [x] `/docs/sprints/S<N>/INTERACTIONS.yaml` : entrée **ChatGPT** créée avec les **tests prod à exécuter**
- [ ] PO a répondu **OK/KO** (ou en attente : `status: pending`)

**Preuves** : `INTERACTIONS.yaml`

---

## 10) Récap final (US → Done)

- [ ] Toutes les cases ci‑dessus sont cochées
- [x] `BACKLOG.md` : US marquée **Delivered** (ou **Spillover** si report)
- [ ] Si `origin: auto` → **`links.api` + ≥ 2 AC + note sécurité/RLS** présents
