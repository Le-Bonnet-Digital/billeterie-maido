# QA\_CHECKLIST — Billeterie Maïdo

À utiliser par Codex (QA) et le PO pour valider qu’une US est prête à passer en `Done`.

## Généraux (toutes US)

* [ ] CI verte (lint, tests unitaires/intégration, build)
* [ ] Aucune fuite de secrets (diff vérifié)
* [ ] Logs structurés présents (corrélation id)
* [ ] Headers sécurité (CSP/HSTS/no-sniff/referrer-policy)
* [ ] RLS/roles : tests d’accès passés

## Sprint 0 — Enablers

**US-00 (Stripe)**

* [ ] Redirection Checkout OK (dev)
* [ ] Webhook Stripe vérifié (signature) → `payment_status='PAID'`
* [ ] Idempotence : relecture d’event → état inchangé
* [ ] Email confirmation envoyé (log ou réel)

**US-01 (Auth/RLS)**

* [ ] Client ne voit que ses réservations
* [ ] Prestataire ne voit que ses validations
* [ ] Admin voit toutes les réservations

**US-02 (Capacité)**

* [ ] Tests concurrence (2 paiements simultanés) → 1 seul succès

## Sprint Utilisateur

**US-10**

* [ ] Liste passes (nom, prix, description)
* [ ] Affichage « créneau requis » si applicable

**US-11**

* [ ] Panier add/remove, total en temps réel
* [ ] Paiement bloqué si CGV non cochées

**US-12**

* [ ] Paiement OK → page success ; cancel → panier intact
* [ ] Email reçu avec n° réservation + QR

**US-13**

* [ ] Formulaire email + CAPTCHA
* [ ] Renvoi email si réservation trouvée

## Sprint Parc (Luge)

**US-20**

* [ ] Scan/saisie code valide → succès
* [ ] Seconde validation refusée (message clair)

**US-21**

* [ ] Compteur du jour Luge affiche total correct

## Sprint Prestataires

**US-30 / US-31**

* [ ] Poney ne voit pas Tir, et inversement
* [ ] Scan valide/invalide → retour approprié

**US-32**

* [ ] Tableau validations 7j par activité correct

## Sprint Admin

**US-40**

* [ ] CRUD événements/passes/slots fonctionnel

**US-41**

* [ ] Liste réservations filtrable + export CSV correct

**US-42**

* [ ] Reporting CA total, ventes par pass, courbe journalière correct

## Validation finale PO

* [ ] Scénarios critiques testés en prod sans erreur
* [ ] Métriques/logs conformes
* [ ] GO/NO-GO noté dans `PO_NOTES.md`
