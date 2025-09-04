# Billeterie Maïdo

Billetterie serverless pour le Parc de la Luge du Maïdo : vente de passes, gestion de créneaux, paiement Stripe, validation sur site (luge/poney/tir), back‑office admin.

## Stack

* **Front** : React + TypeScript (Vite)
* **Backend** : Supabase (Postgres, Auth, Edge Functions)
* **Paiement** : Stripe Checkout + Webhooks
* **Email** : provider SMTP/API

## Démarrage rapide

```bash
# Prérequis : Node 20+, Supabase CLI, compte Stripe
cp .env.example .env.local   # compléter STRIPE_*, SUPABASE_*, APP_BASE_URL
supabase start               # base locale
npm i
npm run dev                  # front
supabase functions serve     # edge functions locales
```

## Scripts utiles

```bash
npm run dev           # frontend dev
npm run build         # build prod
npm run preview       # preview local
npm run lint          # eslint
npm run test          # tests unitaires
npm run e2e           # e2e (Playwright/Cypress)
supabase db reset     # reset DB locale (migrations + seed)
```

## Arborescence

```
/supabase/migrations          # migrations SQL
/supabase/seed                # jeux de données
/supabase/functions/<fn>/     # edge functions (checkout, stripe-webhook, ...)
/src/shared/contracts/*.ts    # contrats Zod (source de vérité API)
/src/shared/stripe/*.ts
/src/app/*                    # pages & features
/specs/*                      # specs additionnelles
/tests/e2e/*                  # tests end-to-end
AGENTS.md
BACKLOG.md
CHANGELOG.md
QA_CHECKLIST.md
PO_NOTES.md
```

## Orchestration & Qualité

* **Processus** : voir `AGENTS.md`
* **Backlog** : `BACKLOG.md` (US, priorités, statuts)
* **Tests & validation** : `QA_CHECKLIST.md`
* **Journal PO & validations prod** : `PO_NOTES.md`
* **Changements** : `CHANGELOG.md`

## Règles de contribution

* Branches : `feat/US-XX-slug`, `fix/US-XX-…`
* Commits : Conventional Commits
* PR : obligatoire vers `main`, labels d’état (`InProgress` → `InReview` → `QA`) et checklists *gates* (A→D).
* `BACKLOG.md` et `CHANGELOG.md` sont synchronisés par workflow à l’ouverture/MAJ/merge de PR.

## CI/CD

* **CI** : lint, tests unitaires/intégration, build, e2e (sur preview)
* **CD** : merge sur `main` → déploiement *stage* auto ; promotion manuelle → *prod*
* **Secrets (GitHub Secrets)** : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE`, `MAIL_API_KEY`, `APP_BASE_URL`

## Sécurité

* **RLS** : cloisonnement par rôle (`admin`, `parc`, `pony_provider`, `archery_provider`, `atlm_collaborator`, `customer`)
* **Paiement** : Webhook Stripe signé + idempotent (table de déduplication)
* **Validation billets** : PK composite (`reservation_id+activity`) anti‑doublon
* **Headers** : CSP, HSTS, no‑sniff, referrer‑policy
* **Aucun secret** commité (utiliser variables d’environnement)

## Données & RGPD

* Mention légale et politique de confidentialité à publier côté front
* Droit d’accès/suppression : prévoir export/suppression sur demande utilisateur

## Support & Runbook

* Déploiement, rotation de secrets, incident Stripe/email : voir `RUNBOOK.md`

## Licence

* À définir (MIT/Propriétaire).
