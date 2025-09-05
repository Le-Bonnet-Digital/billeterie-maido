# DEMO — Sprint S2

## 1) Contexte

- **Sprint**: S2
- **Scope démo**: US-13 Corriger liste passes ; IMP-02 Observabilité minimale
- **Environnement**: local (http://localhost:5173)
- **Prerequis**: seed exécuté

## 2) Scénario de démo (pas-à-pas)

> Objectif: décrire un enchaînement simple, vérifiable par le PO en 2–5 minutes.

1. Ouvrir la page des passes
2. Vérifier l'affichage sans erreur et badge « Créneau requis »
3. Consulter la console pour voir le log `fetchPasses`

## 3) Données de test

- **Comptes**: n/a
- **Pass/événements**: évènement seed par défaut
- **Codes de test**: n/a

## 4) Résultats attendus

- **API**: RPC `get_passes_with_activities` répond 200
- **UI**: passes affichées ; badge « Créneau requis » présent
- **Data**: n/a

## 5) Preuves

- Captures d’écran clés (ou enregistrement court)
- Extraits de logs (corrélation) si utile
- Exemples de payloads/réponses (redactés)

## 6) Limitations connues / dérogations

- none

## 7) Suivi

- Liens vers PR : `Sprint S2: correction passes`
- Liens vers tests : unit
- Tickets follow‑up : aucun
