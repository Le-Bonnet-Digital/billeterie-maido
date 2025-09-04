# AGENTS.md — Billeterie Maïdo (MVP serverless)

## 0) Objet

Manuel d’exécution pour l’agent (Codex) afin d’enchaîner la prochaine tâche sans clarification. Sources de vérité : `PO_NOTES.md` (instructions PO) → `BACKLOG.md` (user stories & statuts).

## 1) Portée & Contexte

* Produit : Billetterie serverless (passes/billets, créneaux, paiement Stripe, validation sur site luge/poney/tir, back‑office admin).
* Stack : Supabase (Postgres/Auth/Edge Functions), React/TypeScript, Stripe Checkout + Webhooks, provider email.

## 2) Rôles & Responsabilités

* **PO (Julien)** : priorisation, critères d’acceptation, validations finales. Rédige/édite `PO_NOTES.md`.
* **Codex – Serverless/Backend** : contrats d’API (Zod), Edge/Cloud Functions (checkout, stripe-webhook, validate-ticket, resend, find-booking), idempotence, sécurité, observabilité.
* **Codex – Data Engineer** : schéma SQL, RLS/policies, fonctions PL/pgSQL (capacité, numérotation), index, vues/rapports.
* **Codex – Front-End/Designer** : UX/UI responsive & a11y, intégration contrats/types, états d’erreur, performance.
* **Codex – QA/Testeur** : E2E (Playwright/Cypress), tests charge ciblés (k6), tests rôle/RLS, checklist release.

## 3) Flux d’exécution (one-piece flow)

1. Lire `PO_NOTES.md`, puis `BACKLOG.md`.
2. Prendre la première US avec `status: Ready` et priorité la plus haute.
3. Créer la branche `feat/US-XX-slug`.
4. Exécuter la user story en tranches verticales avec **gates** :

   * **Gate A — Serverless/Backend** : contrats Zod + fonctions + tests intégration + logs.
   * **Gate B — Data** : migrations SQL + **RLS** + fonctions SQL + tests concurrence.
   * **Gate C — Front** : intégration UI, a11y/perf ≥ 90, VRT, états d’erreur.
   * **Gate D — QA** : E2E (happy + 2 erreurs), tests rôle/RLS, charge ciblée (si critique).
5. Ouvrir PR et appliquer les labels : `InProgress` → `InReview` → `QA` → merge.
6. Synchroniser automatiquement `BACKLOG.md` (statuts) et `CHANGELOG.md` (entrée) via workflow.
7. Déployer stage → smoke → prod. Consigner l’interaction dans `PO_NOTES.md`.

## 4) Format d’une user story (BACKLOG.md)

```yaml
id: US-XX
persona: client | parc | prestataire | admin
title: <titre>
value: <bénéfice>
priority: P1|P2|P3
status: Ready|InProgress|InReview|QA|Done
owner: serverless|data|frontend|qa
links:
  - design: ./design/<fichier>.md
  - api: ./src/shared/contracts/<fichier>.ts
  - spec: ./specs/<fichier>.md
ac:
  - <critère 1>
  - <critère 2>
notes:
  - <contexte / sécurité / RLS>
```

## 5) Definition of Ready (DoR)

* US rédigée (En tant que…, je veux…, afin de…).
* AC listés, sécurité/RLS mentionnées si pertinent.
* Contrat d’API créé (ou placeholder) + schéma cible esquissé.
* Données de seed définies.

## 6) Definition of Done (DoD)

* Contrats/DTO Zod stables + tests unitaires/intégration verts.
* Migrations SQL + **RLS** + tests rôle OK.
* UI intégrée ; Lighthouse a11y & perf ≥ 90 ; VRT OK.
* E2E verts (happy path + 2 erreurs) ; tests charge ciblés si endpoint critique.
* Logs structurés + alertes (webhook Stripe) en place.
* CI verte (lint/test/build). Aucune fuite de secrets.
* Docs à jour : `RUNBOOK.md`, `CHANGELOG.md`.

## 7) Conventions & Arborescence

```
/supabase/migrations
/supabase/seed
/supabase/functions/<fn>/index.ts
/src/shared/contracts/*.ts
/src/shared/stripe/*.ts
/src/app/*
/specs/*
/tests/e2e/*
BACKLOG.md
CHANGELOG.md
QA_CHECKLIST.md
PO_NOTES.md
AGENTS.md
```

* Branches : `feat/US-XX-…` ; Commits : Conventional Commits.

## 8) Sécurité & RLS

* Rôles JWT : `admin`, `parc`, `pony_provider`, `archery_provider`, `atlm_collaborator`, `customer`.
* Policies :

  * Client → accès à ses réservations uniquement.
  * Prestataire → accès validations de son activité uniquement.
  * Admin → accès global (policy ou rôle DB dédié).
* Idempotence : Stripe webhooks (table déduplication), validations billet (PK composite `reservation_id+activity`).
* Rate‑limit sur endpoints publics (find-booking, resend). Headers sécurité (CSP, HSTS, no‑sniff, referrer‑policy).

## 9) CI/CD & Synchronisation backlog

* Protection `main` : PR obligatoire + checks CI.
* Workflow `backlog-sync` : labels PR → `status` US dans `BACKLOG.md` et entrée `CHANGELOG.md`.
* Secrets via GitHub Secrets : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE`, `MAIL_API_KEY`, `APP_BASE_URL`.

## 10) Ordre recommandé des sprints

* Sprint 0 (enablers) → Utilisateur → Parc (luge) → Prestataires (poney/arc) → Admin.
* À l’intérieur de chaque sprint : slice vertical A→B→C→D ; WIP ≤ 2 US.

## 11) Processus « Prochaine tâche »

1. Lire `PO_NOTES.md` et appliquer ses décisions au backlog.
2. Sélectionner la 1ʳᵉ US `Ready` prioritaire.
3. Brancher `feat/US-XX-slug` et exécuter A→B→C→D.
4. Mettre à jour `owner` de l’US, labels PR, et preuves des gates.
5. À la demande de validation prod, ajouter une entrée horodatée dans `PO_NOTES.md/INTERACTIONS` (tests à réaliser, contexte PR/env).
6. Après réponse du PO :

   * `OK` → passer l’US à `Done`, alimenter `CHANGELOG.md`.
   * `KO` → créer/mettre à jour une US de fix (P1 si bloquant) et relancer le cycle.

## 12) Preuves attendues par gate

* **Gate A** : fichier contrat Zod, validations d’entrée, fonctions edge, logs structurés, tests unit/inté.
* **Gate B** : migrations versionnées (avec rollback), RLS testées, index/constraints, fonctions SQL atomiques + tests concurrence.
* **Gate C** : UI responsive, états *loading/empty/error/success*, a11y & perf ≥ 90, VRT OK, intégration contrats.
* **Gate D** : E2E (happy + erreurs), tests rôle/RLS, tests charge ciblés si critique, `QA_CHECKLIST.md` coché.
