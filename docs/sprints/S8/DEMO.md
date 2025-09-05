# DEMO — Sprint S8

## 1) Contexte

- **Sprint**: S8
- **Scope démo**: US-00 Paiement Stripe, US-01 Auth & Rôles, US-02 Capacité
- **Environnement**: local
- **Prerequis**: seed exécuté, comptes de test

## 2) Scénario de démo (pas-à-pas)

> Objectif: décrire un enchaînement simple, vérifiable par le PO en 2–5 minutes.

1. Ouvrir l'application locale
2. Créer un compte admin et un compte client
3. Ajouter un pass au panier et initier le paiement Stripe
4. Valider le paiement de test et vérifier la mise à jour `PAID`
5. Consulter la table des rôles et vérifier les policies RLS
6. Réserver un créneau et tester la limite de capacité

## 3) Données de test

- **Comptes**: `admin@example.com`, `client@example.com`
- **Pass/événements**: pass luge
- **Codes de test**: carte Stripe 4242 4242 4242 4242

## 4) Résultats attendus

- **API**: codes HTTP corrects ; logs sans PII
- **UI**: affichage succès/erreur ; a11y/perf ≥ 90 (Lighthouse)
- **Data**: paiement `PAID`, rôles appliqués, capacité décrémentée

## 5) Preuves

- Captures d’écran clés ou enregistrement court
- Extraits de logs si utile
- Exemples de payloads/réponses (redactés)

## 6) Limitations connues / dérogations

- …

## 7) Suivi

- Liens vers PR : `Sprint S8: paiement & RLS`
- Liens vers tests : unit/intégration/E2E
- Tickets follow‑up (si nécessaires)
