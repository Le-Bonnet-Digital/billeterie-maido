# DEMO — Sprint S<N>

## 1) Contexte

- **Sprint**: S<N>
- **Scope démo**: US présentées (IDs + titre)
- **Environnement**: local / stage / prod (URL)
- **Prerequis**: seed exécuté ? comptes de test ?

## 2) Scénario de démo (pas-à-pas)

> Objectif: décrire un enchaînement simple, vérifiable par le PO en 2–5 minutes.

1. Ouvrir … (URL)
2. Choisir le pass …
3. Ajouter au panier …
4. Payer via Checkout … (retour /success)
5. Recevoir l’email de confirmation (n° + QR)
6. Scanner le QR côté activité … (refus du double scan)

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

- Liens vers PR : `Sprint S<N>: …`
- Liens vers tests : unit/intégration/E2E
- Tickets follow‑up (si nécessaires)
