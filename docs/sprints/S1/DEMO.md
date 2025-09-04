# DEMO — Sprint S1

## 1) Contexte

- **Sprint**: S1
- **Scope démo**: US-10 Parcourir offres & passes ; US-11 Panier + CGV
- **Environnement**: local
- **Prerequis**: seed exécuté, compte client test

## 2) Scénario de démo (pas-à-pas)

> Objectif: décrire un enchaînement simple, vérifiable par le PO en 2–5 minutes.

1. Ouvrir `http://localhost:5173`
2. Accéder à un événement et voir la liste des pass avec activités et badge "Créneau requis"
3. Ajouter un pass au panier
4. Ouvrir le panier et constater le total
5. Tenter de payer sans accepter les CGV (bouton désactivé)
6. Cocher les CGV puis procéder au paiement (simulé)

## 3) Données de test

- **Comptes**: `customer_demo@example.com` / `***`
- **Pass/événements**: billets seedés
- **Codes de test**: Stripe test cards (4242 …)

## 4) Résultats attendus

- **API**: codes HTTP corrects
- **UI**: affichage succès/erreur ; a11y/perf ≥ 90 (Lighthouse)
- **Data**: réservation créée, paiement `PAID`, validations comptées

## 5) Preuves

- Captures d’écran clés (ou enregistrement court)
- Extraits de logs (corrélation) si utile
- Exemples de payloads/réponses (redactés)

## 6) Limitations connues / dérogations

- Aucune

## 7) Suivi

- Liens vers PR : `Sprint S1: …`
- Liens vers tests : unit/intégration/E2E
- Tickets follow‑up (si nécessaires)
