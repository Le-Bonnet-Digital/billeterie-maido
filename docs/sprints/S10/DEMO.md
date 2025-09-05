# DEMO — Sprint S10

## 1) Contexte

- **Sprint**: S10
- **Scope démo**: US présentées (IDs + titre)
- **Environnement**: local / stage / prod (URL)
- **Prerequis**: seed exécuté ? comptes de test ?

## 2) Scénario de démo (pas-à-pas)

> Objectif: décrire un enchaînement simple, vérifiable par le PO en 2–5 minutes.

1. Ouvrir la page d'accueil et vérifier le catalogue avec badges
2. Ajouter un pass au panier puis accepter les CGV
3. Cliquer sur paiement Stripe et finaliser avec la carte test 4242
4. Être redirigé vers `/success` et constater le panier vidé
5. Vérifier l'email de confirmation contenant le QR code
6. Saisir le code de réservation dans `/provider/pony` et constater la validation

## 3) Données de test

- **Comptes**: `customer_demo@example.com` / `***` (si nécessaire)
- **Pass/événements**: …
- **Codes de test**: Stripe test cards (4242 …)

## 4) Résultats attendus

- **API**: codes HTTP corrects (200/201/4xx) ; logs sans PII
- **UI**: affichage succès/erreur ; a11y/perf ≥ 90 (Lighthouse)
- **Data**: réservation créée, paiement `PAID`, validations comptées

## 5) Preuves

- Captures d’écran clés (ou enregistrement court)
- Extraits de logs (corrélation) si utile
- Exemples de payloads/réponses (redactés)

## 6) Limitations connues / dérogations

- …

## 7) Suivi

- Liens vers PR : `Sprint S10: …`
- Liens vers tests : unit/intégration/E2E
- Tickets follow‑up (si nécessaires)
