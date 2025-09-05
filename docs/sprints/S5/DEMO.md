# DEMO — Sprint S5

## 1) Contexte

- **Sprint**: S5
- **Scope démo**: US-22 Données test compteur luge
- **Environnement**: local
- **Prerequis**: `SUPABASE_DB_URL` défini puis `pnpm run seed:luge`

## 2) Scénario de démo (pas-à-pas)

> Objectif: décrire un enchaînement simple, vérifiable par le PO en 2–5 minutes.

1. Exécuter `pnpm run seed:luge`
2. Ouvrir `http://localhost:5173/provider/luge-counter`
3. Observer le compteur de validations (>0)

## 3) Données de test

- **Comptes**: compte prestataire luge
- **Pass/événements**: validations créées par le script
- **Codes de test**: n/a

## 4) Résultats attendus

- **API**: `luge_validations_today` renvoie un compteur >0
- **UI**: le compteur s'affiche sans erreur
- **Data**: trois validations Luge enregistrées

## 5) Preuves

- Captures d’écran clés (ou enregistrement court)
- Extraits de logs (corrélation) si utile
- Exemples de payloads/réponses (redactés)

## 6) Limitations connues / dérogations

- …

## 7) Suivi

- Liens vers PR : `Sprint S5: données test compteur luge`
- Liens vers tests : `src/pages/provider/__tests__/LugeCounter.test.tsx`
- Tickets follow‑up (si nécessaires)
