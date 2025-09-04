# BACKLOG — Billeterie Maïdo (MVP)

## Sprint 0 — Enablers

### US-00

```yaml
id: US-00
persona: client
title: Paiement Stripe + webhook idempotent
value: paiements fiables et traçables
priority: P1
status: InProgress
owner: serverless
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
ac:
  - Rôles JWT: admin, parc, atlm_collaborator, pony_provider, archery_provider, customer
  - Policies conformes + tests d’accès automatisés
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
ac:
  - Fonction SQL reserve_slot(slot_id,reservation_id,qty) transactionnelle
  - Test concurrence → 1 seule passe
```

## Sprint Utilisateur (Client)

### US-10

```yaml
id: US-10
persona: client
title: Parcourir offres & passes
value: choisir facilement
priority: P1
status: Ready
owner: frontend
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
status: Ready
owner: frontend
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
title: Retrouver mon billet par email
value: récupérer mon billet
priority: P2
status: Ready
owner: serverless
ac:
  - Formulaire email + CAPTCHA
  - Renvoi d’email si trouvé, message si non trouvé
```

## Sprint Parc (Luge)

### US-20

```yaml
id: US-20
persona: parc
title: Valider billet Luge (scan/QR)
value: admettre rapidement
priority: P1
status: Ready
owner: serverless
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
status: Ready
owner: data
ac:
  - Vue compteur validés aujourd’hui (agrégat simple)
```

## Sprint Prestataires

### US-30

```yaml
id: US-30
persona: prestataire
title: Valider Poney
value: contrôler l’accès
priority: P1
status: Ready
owner: serverless
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
ac:
  - Scan/saisie code → succès/erreur
  - RLS prestataire: accès ARCHERY uniquement
```

### US-32

```yaml
id: US-32
persona: prestataire
title: Stats 7j par activité
value: visualiser l’affluence
priority: P3
status: Ready
owner: data
ac:
  - Tableau validations J-6..J filtrable par activité
```

## Sprint Admin

### US-40

```yaml
id: US-40
persona: admin
title: CRUD Événements / Passes / Slots
value: configurer l’offre
priority: P1
status: Ready
owner: data
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
ac:
  - CA total période, ventes par pass, courbe journalière
```
