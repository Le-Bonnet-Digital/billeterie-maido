# DEMO — Sprint S8

## 1) Contexte

- **Sprint**: S8
- **Scope démo**: IMP-06 Mesurer la vélocité réelle
- **Environnement**: local
- **Prerequis**: `SPRINT_HISTORY.md` présent

## 2) Scénario de démo (pas-à-pas)

> Objectif: calculer la moyenne des SP livrés sur les trois derniers sprints.

1. Ouvrir un terminal à la racine du projet
2. Exécuter `npm test src/__tests__/velocity.test.ts`
3. Observer dans la sortie la moyenne `8`

## 3) Données de test

- **Fichier**: `SPRINT_HISTORY.md`

## 4) Résultats attendus

- La commande de test passe et affiche la moyenne `8`

## 5) Preuves

- Capture d'écran de la sortie de test (optionnel)

## 6) Limitations connues / dérogations

- Le script lit uniquement les trois derniers sprints

## 7) Suivi

- Liens vers PR : `Sprint S8: paiement & RLS`
- Liens vers tests : `src/__tests__/velocity.test.ts`
- Tickets follow‑up : US-00, US-01, US-02, IMP-07 en spillover
