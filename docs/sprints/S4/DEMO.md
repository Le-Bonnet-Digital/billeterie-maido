# DEMO — Sprint S4

## 1) Contexte

- **Sprint**: S4
- **Scope démo**: US-21 Compteur jour Luge
- **Environnement**: local
- **Prerequis**: aucune donnée particulière

## 2) Scénario de démo (pas-à-pas)

> Objectif: décrire un enchaînement simple, vérifiable par le PO en 2–5 minutes.

1. Ouvrir `http://localhost:5173/provider/luge-counter`
2. Observer le nombre de validations Luge du jour

## 3) Données de test

- **Comptes**: compte prestataire luge
- **Pass/événements**: validations existantes
- **Codes de test**: n/a

## 4) Résultats attendus

- **API**: requête `luge_validations_today` renvoie le compteur
- **UI**: le compteur s'affiche sans erreur
- **Data**: nombre reflète les validations du jour

## 5) Preuves

- Captures d’écran clés (ou enregistrement court)
- Extraits de logs (corrélation) si utile
- Exemples de payloads/réponses (redactés)

## 6) Limitations connues / dérogations

- agrégat simple pour le jour courant

## 7) Suivi

- Liens vers PR : `Sprint S4: compteur luge`
- Liens vers tests : `src/pages/provider/__tests__/LugeCounter.test.tsx`
- Tickets follow‑up (si nécessaires)
