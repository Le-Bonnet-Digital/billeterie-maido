# BACKLOG — Billeterie Maïdo (MVP)

> Statuts US : `Ready | Selected | InSprint | Delivered | Done | Spillover`
> Champs : `owner`, `sp`, `sprint`, `type` (feature|improvement|fix), `origin` (po|auto), `links.api`

---

## Sprint 0 — Enablers (exemples)

### US-00

```yaml
id: US-00
persona: client
title: Paiement Stripe + webhook idempotent
value: paiements fiables et traçables
priority: P1
status: Ready
owner: serverless
sp: 5
sprint: null
type: feature
origin: po
links:
  - api: ./src/shared/contracts/checkout.ts
ac:
  - Checkout Stripe depuis panier + retour /success|/cancel
  - Webhook vérifié (signature) met payment_status='PAID' (idempotent)
  - Journalisation + alerte échec webhook
notes:
  - Table stripe_sessions pour déduplication
```

### US-01

```yaml
id: US-01
persona: admin
title: Auth & Rôles + RLS de base
value: cloisonnement des données
priority: P1
status: Ready
owner: data
sp: 5
sprint: null
type: feature
origin: po
ac:
  - Rôles JWT: admin, parc, prestataire, customer
  - Policies conformes + tests d’accès automatisés
notes:
  - Ajouter fixtures de rôles/claims côté seed
```

### US-02

```yaml
id: US-02
persona: admin
title: Capacité & créneaux atomiques
value: éviter la surréservation
priority: P1
status: Ready
owner: data
sp: 5
sprint: null
type: feature
origin: po
ac:
  - Fonction reserve_slot(slot_id,reservation_id,qty) transactionnelle
  - Test concurrence → 1 seule passe
notes:
  - Index sur slot_id + stratégie de verrouillage
```

---

## Sprint Utilisateur (Client) — exemples

### US-10

```yaml
id: US-10
persona: client
title: Parcourir offres & passes
value: choisir facilement
priority: P1
status: Delivered
owner: qa
sp: 3
sprint: 1
type: feature
origin: po
ac:
  - Liste passes: nom, prix, description, activités incluses
  - Affichage “créneau requis” si applicable
```

### US-11

```yaml
id: US-11
persona: client
title: Panier + CGV
value: préparer ma commande
priority: P1
status: Delivered
owner: qa
sp: 3
sprint: 1
type: feature
origin: po
ac:
  - Ajouter/retirer billets, total en temps réel
  - Paiement désactivé tant que CGV non cochées
```

### US-12

```yaml
id: US-12
persona: client
title: Payer et recevoir la confirmation
value: finaliser mon achat
priority: P1
status: Ready
owner: serverless
sp: 5
sprint: null
type: feature
origin: po
links:
  - api: ./src/shared/contracts/checkout.ts
ac:
  - Redirection Checkout + retour success/cancel
  - Email confirmation avec n° de réservation + QR
```

### US-13

```yaml
id: US-13
persona: client
title: Corriger liste passes (fonction get_passes_with_activities)
value: pouvoir vérifier les passes en prod
priority: P1
status: Delivered
owner: qa
sp: 1
sprint: 2
type: fix
origin: po
links:
  - api: ./src/shared/contracts/passes.ts
ac:
  - Fonction SQL get_passes_with_activities(event_uuid) disponible via Supabase
  - Page Passes affiche les passes sans erreur et badge "Créneau requis" le cas échéant
notes:
  - RLS: vérifier que la fonction respecte les policies existantes
```

### IMP-02

```yaml
id: IMP-02
persona: dev
title: Observabilité minimale
value: faciliter le diagnostic
priority: P2
status: Delivered
owner: qa
sp: 1
sprint: 2
type: improvement
origin: auto
links:
  - api: ./src/lib/logger.ts
ac:
  - Logger centralisé pour les appels critiques
  - Les logs n'exposent aucune donnée sensible
notes:
  - Sécurité: éviter PII dans les logs
```

### US-14

```yaml
id: US-14
persona: dev
title: Ajouter colonne guaranteed_runs aux passes
value: corriger la fonction get_passes_with_activities
priority: P1
status: Done
owner: qa
sp: 1
sprint: 3
type: fix
origin: po
links:
  - api: ./supabase/migrations/20250905003500_get_passes_with_activities.sql
ac:
  - Migration ajoute la colonne guaranteed_runs integer à passes
  - `supabase db push` s'exécute sans erreur
notes:
  - RLS: colonne lecture seule, policies existantes suffisantes
```

---

## Sprint Parc (Luge) — exemples

### US-20

```yaml
id: US-20
persona: parc
title: Valider billet Luge (scan/QR)
value: admettre rapidement
priority: P1
status: Ready
owner: serverless
sp: 5
sprint: null
type: feature
origin: po
ac:
  - Saisie/scan code → succès/erreur claire
  - Anti-doublon (PK reservation_id+LUGE)
```

### US-21

```yaml
id: US-21
persona: parc
title: Compteur jour Luge
value: suivre le flux
priority: P2
status: Delivered
owner: data
sp: 2
sprint: 4
type: feature
origin: po
ac:
  - Vue compteur validés aujourd’hui (agrégat simple)
```

### US-22

```yaml
id: US-22
persona: parc
title: Données test compteur luge
value: valider le flux
priority: P1
status: Done
owner: data
sp: 1
sprint: 5
type: fix
origin: po
ac:
  - Script ou doc pour créer des validations Luge en test
  - Démo compteur >0 avec données seed
notes:
  - RLS inchangées
```

### US-23

```yaml
id: US-23
persona: data
title: Corriger nommage migrations Supabase
value: éviter les réparations manuelles
priority: P1
status: Delivered
owner: data
sp: 1
sprint: 6
type: fix
origin: po
ac:
  - Remplacer le script `seed_luge_validations.sql` par une migration Supabase
  - Renommer la migration `20250829023000_extend_get_parc_activities_with_variants.sql` pour respecter le format attendu
notes:
  - Sécurité: RLS inchangées, garantit `supabase migration repair` sans intervention manuelle
```

---

## Sprint Prestataires — exemples

### US-30

```yaml
id: US-30
persona: prestataire
title: Valider Poney
value: contrôler l’accès
priority: P1
status: Ready
owner: serverless
sp: 3
sprint: null
type: feature
origin: po
ac:
  - Scan/saisie code → succès/erreur
  - RLS prestataire: accès PONEY uniquement
```

### US-31

```yaml
id: US-31
persona: prestataire
title: Valider Tir à l’arc
value: contrôler l’accès
priority: P1
status: Ready
owner: serverless
sp: 3
sprint: null
type: feature
origin: po
ac:
  - Scan/saisie code → succès/erreur
  - RLS prestataire: accès ARCHERY uniquement
```

---

## Sprint Admin — exemples

### US-40

```yaml
id: US-40
persona: admin
title: CRUD Événements / Passes / Slots
value: configurer l’offre
priority: P1
status: Ready
owner: data
sp: 8
sprint: null
type: feature
origin: po
ac:
  - Créer/modifier événements, passes (prix), slots (capacité, horaire)
```

### US-41

```yaml
id: US-41
persona: admin
title: Liste réservations + filtres + export CSV
value: assistance & analyse
priority: P1
status: Ready
owner: frontend
sp: 5
sprint: null
type: feature
origin: po
ac:
  - Filtrer par statut/période/email
  - Export CSV
```

### US-42

```yaml
id: US-42
persona: admin
title: Reporting simple (CA, volumes)
value: pilotage
priority: P2
status: Ready
owner: data
sp: 5
sprint: null
type: feature
origin: po
ac:
  - CA total période, ventes par pass, courbe journalière
```

### US-100

```yaml
id: US-100
persona: dev
title: Utilitaire parsePrice
value: standardiser la saisie de prix
priority: P2
status: Delivered
owner: frontend
sp: 5
sprint: 7
type: improvement
origin: auto
links:
  - api: ./src/lib/money.ts
ac:
  - "12,50 €" est converti en 12.5
  - un format invalide déclenche une erreur
notes:
  - Sécurité: validation côté client uniquement, aucun impact RLS
```

### US-101

```yaml
id: US-101
persona: dev
title: Utilitaire formatDate
value: affichage cohérent des dates
priority: P2
status: Delivered
owner: frontend
sp: 5
sprint: 7
type: improvement
origin: auto
links:
  - api: ./src/lib/date.ts
ac:
  - une date ISO est affichée en jj/mm/aaaa
  - le paramètre locale modifie le format
notes:
  - Sécurité: pas de données sensibles, RLS non applicable
```

### US-102

```yaml
id: US-102
persona: dev
title: Utilitaire slugify
value: générer des URLs propres
priority: P2
status: Delivered
owner: frontend
sp: 5
sprint: 7
type: improvement
origin: auto
links:
  - api: ./src/lib/string.ts
ac:
  - accents et espaces sont normalisés en tirets
  - les tirets en bord de chaîne sont retirés
notes:
  - Sécurité: sanitation côté client, RLS non applicable
```

### US-103

```yaml
id: US-103
persona: dev
title: Utilitaire clamp
value: contraindre une valeur numérique
priority: P3
status: Delivered
owner: frontend
sp: 5
sprint: 7
type: improvement
origin: auto
links:
  - api: ./src/lib/math.ts
ac:
  - une valeur sous le minimum renvoie le minimum
  - une valeur au-dessus du maximum renvoie le maximum
notes:
  - Sécurité: aucune donnée externe, RLS non applicable
```

---

## Règles pour US auto‑générées (par ChatGPT)

- Ajouter `origin: auto`
- **≥ 2 AC** obligatoires
- Une **note sécurité/RLS** dans `notes:`
- Un lien `links.api` (placeholder accepté)

> Le hook Husky vérifie ces règles pour toute US `origin: auto` passée en `Delivered`.
