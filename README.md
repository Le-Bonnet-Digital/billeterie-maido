# Billeterie Maïdo — README

## 1) Pré‑requis & installation

- Windows 11, PowerShell 7+
- Node.js 20+, npm
- (Selon stack) Supabase CLI **ou** outils SQL Server
- Comptes/API : Stripe (clé test), service d’email (clé API)

### Variables d’environnement

Créez **`.env.local`** depuis `.env.example` et renseignez au minimum :

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MAIL_API_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

_(Ne pas committer de secrets)_

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

> À exécuter **par le PO** sur demande de ChatGPT (Gate 0 – Préflight). ChatGPT **ne lance pas** de migrations.

- **Supabase/Postgres** :

```powershell
supabase db dump --schema public -f schema.sql
```

- **SQL Server** :

```powershell
sqlpackage /Action:Export /SourceConnectionString:"<...>" /TargetFile:schema.sql
```

---

## 3) Hooks locaux (Husky)

> L’environnement ne lance pas GitHub Actions. Les contrôles se font **en local** via un hook `pre-commit` Husky.

### Installation (une fois)

```powershell
# Activer Husky (si non fait)
npx husky install
# Activer le hook fourni
# (placez le script dans .husky/pre-commit et donnez-lui les droits d'exécution)
```

### Ce que vérifie `.husky/pre-commit`

- Artefacts sprint présents : `/docs/sprints/S<N>/{PLAN.md, BOARD.md, DEMO.md, REVIEW.md, RETRO.md, PREFLIGHT.md, INTERACTIONS.yaml}`
- `PREFLIGHT.md` contient **Code audit**, **DB audit** et **schema.sql RefreshedAt (ISO)** ou **`unchanged` justifié**
- `INTERACTIONS.yaml` du sprint est **stagé** et contient `topic: Sprint S<N> — …`
- `BACKLOG.md` :
  - US `origin: auto` en `Delivered` → **`links.api`**, **≥ 2 AC**, **note sécurité/RLS**
  - US `Delivered` → `sp` et `type` présents

- Si **migrations** modifiées → `schema.sql` mis à jour **ou** justification `unchanged` dans `PREFLIGHT.md`
- `git-secrets --scan` si dispo, puis `npm run lint && npm test && lint-staged`

> Si un point échoue, **le commit est bloqué**. Corrigez puis recommittez.

---

## 4) Mode agent — Sprint 25 min

1. **Initialisation** : `npm run sprint:init` (crée `/docs/sprints/S<N>` depuis `docs/templates`) puis démarrer un minuteur 25 min
2. **Déclencheur** : « **Passe au sprint suivant** »
3. **Gate 0 — Pré‑vol** : remplir `PREFLIGHT.md` (audit code + BDD, `schema.sql`)
4. **Planification** : estimer en **SP** (1,2,3,5,8,13), capacité = vélocité×0.8 (+10% improvements) → `PLAN.md`
5. **Exécution** : A→B→C→D, mise à jour `BOARD.md` (**Selected → InSprint → Delivered → Spillover**)
6. **Gel T+22** : compléter `DEMO.md`, `REVIEW.md`, `RETRO.md`, consigner l’entrée **INTERACTIONS** (tests prod) dans `/docs/sprints/S<N>/INTERACTIONS.yaml`
7. **PR unique** : `work → main`, titre `Sprint S<N>: …`

**Rappels**

- Branche **unique** : `work`
- **Une seule PR** en fin de sprint
- **Pré‑vol obligatoire** ; `schema.sql` **à jour** (ou `unchanged` justifié)
- **Migrations** : ChatGPT **documente** ; le **PO** les **applique**

---

## 5) Backlog & user stories

- `status` : `Ready → Selected → InSprint → Delivered → Done → Spillover`
- `owner` : `serverless | data | frontend | qa`
- `sp` : `1|2|3|5|8|13` ; `sprint` : `<N|null>`
- `type` : `feature | improvement | fix` ; `origin` : `po | auto`
- `links.api` : chemin d’un contrat d’API/DTO (placeholder accepté pour `origin: auto`)

**Autogrooming** : si aucune US **Ready**, ChatGPT génère des US (MVP) avec **≥2 AC**, **note sécurité/RLS**, `links.api` placeholder.

---

## 6) Qualité & sécurité

- **Quality Gates** : [`QUALITY-GATES.md`](QUALITY-GATES.md) (Gate 0/A/B/C/D/S)
- **DoD** : [`DoD.md`](DoD.md) — CI locale verte, couverture ≥ 80% des nouvelles lignes, docs à jour, sécurité OK
- **Sécurité** :
  - Jamais de secrets en repo/PR
  - Webhooks Stripe **signés**, logique **idempotente**
  - **RLS/policies** testées (admin, parc, prestataires, customer)
  - Logs structurés (corrélation), pas de PII

---

## 7) Arborescence utile

```
/docs/templates/           # Modèles PLAN/BOARD/DEMO/REVIEW/RETRO/PREFLIGHT/INTERACTIONS
/docs/sprints/S<N>/        # Artefacts du sprint courant
/src/shared/contracts/     # Contrats d’API/DTO
supabase/migrations/       # Migrations (si Supabase)
Infrastructure/**/Migrations/ # EF (si SQL Server)
schema.sql                 # Snapshot schéma (mis à jour par le PO)
.husky/pre-commit          # Garde-fou local (obligatoire)
BACKLOG.md                 # US (statuts, SP, sprint, origin)
PO_NOTES.md                # Instructions stables PO
QUALITY-GATES.md           # Gates 0/A/B/C/D/S
DoD.md                     # Definition of Done
```

---

## 8) Dépannage

- **Commit bloqué** : lire le message du hook, compléter l’artefact manquant (PREFLIGHT/DEMO/… ou INTERACTIONS)
- **Migrations modifiées** : mettre à jour `schema.sql` ou justifier `unchanged` dans `PREFLIGHT.md`
- **Lighthouse < 90** : optimiser images, lazy‑load, réduire JS bloquant, corriger a11y (labels/contraste)

---

## 9) Rôle du PO

- Le **PO** fournit **OK/KO**, **secrets/clé API**, et **exécute** les actions listées par ChatGPT dans `ACTIONS_PO`.
- ChatGPT gère **grooming**, **planification**, **exécution** et **documentation** du sprint timeboxé.
