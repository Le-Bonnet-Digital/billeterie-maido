# DEMO — Sprint S3

## 1) Contexte

- **Sprint**: S3
- **Scope démo**: US-14 Ajouter colonne guaranteed_runs aux passes
- **Environnement**: local http://localhost:5173
- **Prerequis**: migration appliquée (`supabase db push`)

## 2) Scénario de démo (pas-à-pas)

> Objectif: décrire un enchaînement simple, vérifiable par le PO en 2–5 minutes.

1. Appliquer `supabase db push --include-all --yes`
2. Ouvrir la page des passes
3. Vérifier l’affichage sans erreur

## 3) Données de test

- **Comptes**: aucun
- **Pass/événements**: n/a
- **Codes de test**: n/a

## 4) Résultats attendus

- **API**: migration sans erreur
- **UI**: liste des passes chargée
- **Data**: colonne `guaranteed_runs` visible dans passes

## 5) Preuves

- Captures d’écran clés (à ajouter)
- Extraits de logs si utile
- Exemples de payloads (optionnel)

## 6) Limitations connues / dérogations

- néant

## 7) Suivi

- Liens vers PR : `Sprint S3: ...`
- Liens vers tests : `npm test`
- Tickets follow‑up : n/a
