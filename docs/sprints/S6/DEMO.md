# DEMO — Sprint S6

## 1) Contexte

- **Sprint**: S6
- **Scope démo**: US-23 — Corriger nommage migrations Supabase
- **Environnement**: local
- **Prerequis**: migration appliquée

## 2) Scénario de démo (pas-à-pas)

> Objectif: décrire un enchaînement simple, vérifiable par le PO en 2–5 minutes.

1. Exécuter `supabase migration repair` puis `supabase migration up`
2. Vérifier que la migration `20250829023000_extend_get_parc_activities_with_variants.sql` est bien listée
3. Vérifier que les données de démonstration Luge sont insérées

## 3) Données de test

- **Comptes**: `customer_demo@example.com` / `***` (si nécessaire)
- **Pass/événements**: …
- **Codes de test**: Stripe test cards (4242 …)

## 4) Résultats attendus

- **API**: migrations appliquées sans erreur
- **UI**: n/a
- **Data**: réservation de démo et validations Luge présentes

## 5) Preuves

- Captures d’écran clés (ou enregistrement court)
- Extraits de logs (corrélation) si utile
- Exemples de payloads/réponses (redactés)

## 6) Limitations connues / dérogations

- …

## 7) Suivi

- Liens vers PR : `Sprint S6: …`
- Liens vers tests : unit/intégration/E2E
- Tickets follow‑up (si nécessaires)
