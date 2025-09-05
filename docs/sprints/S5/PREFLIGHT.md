# PREFLIGHT — Sprint S5

## 1) Contexte

- **Sprint**: S5
- **Date**: 2025-09-05T07:53:26Z
- **Objectif**: audit existant avant implémentation

## 2) Code audit

- Doublons détectés: néant
- Code mort/obsolète: aucun repéré
- Refactors simples (≤ timebox): ajouter script/commande pour seed validations Luge

## 3) DB audit

- Tables/colonnes: `reservation_validations` pour comptage Luge
- RLS/policies: policies existantes sur `reservation_validations`
- Fonctions/procédures: vue `luge_validations_today`
- Index/contraintes: index existants suffisent

## 4) Migrations

- Nouvelles migrations prévues: aucune
- Rollback: n/a
- **Application**: par le PO après merge (ChatGPT ne lance pas la CLI DB)

## 5) Schéma SQL (`schema.sql`)

- **RefreshedAt**: unchanged (pas de migration)

## 6) Sécurité

- Validation entrées: contrôles existants dans `LugeValidation.tsx`
- Secrets: aucun nouveau secret
- Policies RLS: déjà en place pour rôles `luge_provider`

## 7) Observabilité

- Logs structurés: logger existant utilisé dans `LugeCounter`
- Tracing/Correlation: non implémenté

## 8) Plan d’action ≤ timebox

- Nettoyage/refactor immédiat: documenter script de seed
- Actions différées (ticket backlog): renommer migration récurrente `20250829_extend_get_parc_activities_with_variants.sql`

---

> ⚠️ Ce fichier doit être complété **au début du sprint**. Les hooks Husky bloquent le commit si `schema.sql` n’est pas **rafraîchi** ou noté `unchanged` justifié.
