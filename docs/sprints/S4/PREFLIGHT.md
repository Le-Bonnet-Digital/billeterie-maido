# PREFLIGHT — Sprint S4

## 1) Contexte

- **Sprint**: S4
- **Date**: 2025-09-05T06:40:54+00:00
- **Objectif**: audit existant avant implémentation

## 2) Code audit

- Doublons détectés: aucun
- Code mort/obsolète: none repéré
- Refactors simples (≤ timebox): mutualiser gestion erreurs Supabase

## 3) DB audit

- Tables/colonnes: passes (guaranteed_runs), reservations, etc.
- RLS/policies: passes et reservations protégées par rôle
- Fonctions/procédures: get_passes_with_activities
- Index/contraintes: clés primaires et foreign keys présentes

## 4) Migrations

- Nouvelles migrations prévues: aucune
- Rollback: n/a
- **Application**: par le PO après merge (ChatGPT ne lance pas la CLI DB)

## 5) Schéma SQL (`schema.sql`)

- **RefreshedAt**: unchanged (aucune migration depuis 2025-09-05)

## 6) Sécurité

- Validation entrées: contrôles via zod sur formulaire
- Secrets: aucun secret en repo
- Policies RLS: policies existantes vérifiées pour passes/reservations

## 7) Observabilité

- Logs structurés: console JSON côté serverless
- Tracing/Correlation: non implémenté

## 8) Plan d’action ≤ timebox

- Nettoyage/refactor immédiat: centraliser erreurs Supabase
- Actions différées (ticket backlog): ajouter monitoring pour Supabase

---

> ⚠️ Ce fichier doit être complété **au début du sprint**. Les hooks Husky bloquent le commit si `schema.sql` n’est pas **rafraîchi** ou noté `unchanged` justifié.
