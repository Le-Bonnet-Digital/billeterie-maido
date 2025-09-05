# PREFLIGHT — Sprint S8

## 1) Contexte

- **Sprint**: S8
- **Date**: 2025-09-05
- **Objectif**: audit existant avant implémentation

## 2) Code audit

- Doublons détectés: néant
- Code mort/obsolète: néant
- Refactors simples (≤ timebox): néant

## 3) DB audit

- Tables/colonnes: en attente de spécification
- RLS/policies: à définir pour nouvelles tables
- Fonctions/procédures: aucune
- Index/contraintes: à vérifier

## 4) Migrations

- Nouvelles migrations prévues: ajout roles & réservation de créneaux
- Rollback: scripts inverse à prévoir
- **Application**: par le PO après merge (ChatGPT ne lance pas la CLI DB)

## 5) Schéma SQL (`schema.sql`)

- **RefreshedAt**: n/a
- Ou justification `unchanged`: aucune modification BDD prévue avant implémentation

## 6) Sécurité

- Validation entrées: via utilitaires existants
- Secrets: gérer dans `.env.local` (Stripe)
- Policies RLS: à écrire pour les nouvelles tables

## 7) Observabilité

- Logs structurés: logger centralisé prêt
- Tracing/Correlation: n/a

## 8) Plan d’action ≤ timebox

- Nettoyage/refactor immédiat: aucun
- Actions différées (ticket backlog): script docgen, mesure vélocité

---

> ⚠️ Ce fichier doit être complété **au début du sprint**. Les hooks Husky bloquent le commit si `schema.sql` n’est pas **rafraîchi** ou noté `unchanged` justifié.
