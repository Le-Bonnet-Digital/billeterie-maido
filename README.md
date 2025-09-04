# Billeterie Maïdo — README

## 1) Pré‑requis & installation

* Windows 11, PowerShell 7+
* Node.js 20+, npm
* (Selon stack) Supabase CLI **ou** outils SQL Server
* Comptes/API : Stripe (clé test), service d’email (clé API)

### Variables d’environnement

Créez **`.env.local`** depuis `.env.example` et renseignez au minimum :

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MAIL_API_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

*(Ne pas committer de secrets)*

---

## 2) Démarrage local

```powershell
# Front / API (selon repo)
npm ci
npm run dev

# Si Supabase (Postgres)
supabase start
supabase functions serve
```

### Rafraîchir le schéma BDD (`schema.sql`)

> À exécuter **sur demande de ChatGPT** (Gate 0 – Préflight)

* **Supabase/Postgres** :

```powershell
supabase db dump --schema public -f schema.sql
```

* **SQL Server** :

```powershell
sqlpackage /Action:Export /SourceConnectionString:"<...>" /TargetFile:schema.sql
```

---

## 3) Hooks locaux (garde‑fous)

> L’environnement ne lance pas GitHub Actions. Les contrôles se font **en local** via un hook `pre-commit` PowerShell.

### Installation (une fois)

```powershell
# Activer le dossier de hooks du repo
git config core.hooksPath .githooks

# Autoriser l’exécution des scripts PowerShell pour l’utilisateur courant
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Ce que vérifie `.githooks/pre-commit.ps1`

* Artefacts sprint présents : `/docs/sprints/S<N>/{PLAN.md, BOARD.md, DEMO.md, REVIEW.md, RETRO.md, PREFLIGHT.md}`
* `PREFLIGHT.md` contient **Code audit**, **DB audit** et **schema.sql RefreshedAt (ISO)** ou **`unchanged` justifié**
* `PO_NOTES.md/INTERACTIONS` a une entrée **Sprint S<N>** (tests prod à exécuter)
* `BACKLOG.md` :

  * US **livrées** en `Done` ; `Spillover` exclues de la démo
  * US `origin: auto` en `Done` → **`links.api`**, **≥ 2 AC**, **note sécurité/RLS**
  * US `Done` → `sp` et `type` présents
* Si **migrations** modifiées → `schema.sql` mis à jour **ou** justification `unchanged` dans `PREFLIGHT.md`

> Si un point échoue, **le commit est bloqué**. Corrigez puis recommittez.

---

## 4) Mode agent — Sprint 25 min

1. **Déclencheur** : « **Passe au sprint suivant** »
2. **Gate 0 — Pré‑vol** : remplir `PREFLIGHT.md` (audit code + BDD, `schema.sql`)
3. **Planification** : estimer en **SP** (1,2,3,5,8,13), capacité = vélocité×0.8 (+10% improvements) → `PLAN.md`
4. **Exécution** : A→B→C→D, mise à jour continue de `BOARD.md` (**Selected → InSprint → Done → Spillover**)
5. **Gel T+22** : compléter `DEMO.md`, `REVIEW.md`, `RETRO.md`, consigner l’entrée **INTERACTIONS** (tests prod) dans `PO_NOTES.md`
6. **PR unique** : `work → main`, titre `Sprint S<N>: …`

**Rappels**

* Branche **unique** : `work`
* **Une seule PR** en fin de sprint
* **Pré‑vol obligatoire** ; `schema.sql` **à jour** (ou `unchanged` justifié)

---

## 5) Backlog & user stories

* `status` : `Ready → Selected → InSprint → Done → Spillover → Merged`
* `owner` : `serverless | data | frontend | qa`
* `sp` : `1|2|3|5|8|13` ; `sprint` : `<N|null>`
* `type` : `feature | improvement | fix` ; `origin` : `po | auto`
* `links.api` : chemin d’un contrat d’API/DTO (placeholder accepté pour `origin: auto`)

**Autogrooming** : si aucune US **Ready**, ChatGPT génère des US depuis `PO_NOTES.md/NEW_FEATURES` (ou discovery), avec **≥2 AC**, **note sécurité/RLS**, `links.api` placeholder.

---

## 6) Qualité & sécurité

* **Quality Gates** : voir `QUALITY-GATES.md` (Gate 0/A/B/C/D/S)
* **DoD** : CI verte, couverture ≥ 80% des nouvelles lignes, docs à jour (`DEMO/REVIEW/RETRO`), sécurité OK
* **Sécurité** :

  * Jamais de secrets en repo/PR
  * Webhooks Stripe **signés**, logique **idempotente**
  * **RLS/policies** testées (admin, parc, prestataires, customer)
  * Logs structurés (corrélation), pas de PII

---

## 7) Arborescence utile

```
/docs/templates/           # Modèles PLAN/BOARD/DEMO/REVIEW/RETRO/PREFLIGHT
/docs/sprints/S<N>/        # Artefacts du sprint courant
/src/shared/contracts/     # Contrats d’API/DTO
supabase/migrations/       # Migrations (si Supabase)
Infrastructure/**/Migrations/ # EF (si SQL Server)
.githooks/pre-commit.ps1   # Garde-fou local (obligatoire)
BACKLOG.md                 # US (statuts, SP, sprint, origin)
PO_NOTES.md                # Rôle PO, inputs, interactions, rétro
QUALITY-GATES.md           # Gates 0/A/B/C/D/S
DoD.md                     # Definition of Done
```

---

## 8) Dépannage

* **Commit bloqué** : lire le message du hook, compléter l’artefact manquant (PREFLIGHT/DEMO/… ou PO\_NOTES)
* **Migrations modifiées** : mettre à jour `schema.sql` ou justifier `unchanged` dans `PREFLIGHT.md`
* **Lighthouse < 90** : optimiser images, lazy‑load, réduire JS bloquant, corriger a11y (labels/contraste)

---

## 9) Contact & rôle du PO

* Le **PO** fournit **OK/KO**, **secrets/clé API**, et **orientations** dans `PO_NOTES.md`.
* ChatGPT gère **grooming**, **planification**, **exécution** et **documentation** du sprint timeboxé.
