# PREFLIGHT — Sprint S6

## 1) Contexte

- **Sprint**: S6
- **Date**: 2025-09-05T09:00:00Z
- **Objectif**: préparer migration pour validations Luge

## 2) Code audit

- Doublons détectés: néant
- Code mort/obsolète: script `seed_luge_validations.sql` à remplacer
- Refactors simples (≤ timebox): renommage migration ciblée

## 3) DB audit

- Tables/colonnes: `reservation_validations`, `luge_validations_today`
- RLS/policies: existantes sur `reservation_validations`
- Fonctions/procédures: vue `luge_validations_today`
- Index/contraintes: conformes

## 4) Migrations

- Nouvelles migrations prévues: migration validations Luge + renaming `20250829_extend_get_parc_activities_with_variants.sql`
- Rollback: n/a
- **Application**: par le PO après merge (ChatGPT ne lance pas la CLI DB)

## 5) Schéma SQL (`schema.sql`)

- **RefreshedAt**: unchanged (pas de migration appliquée)
- Ou justification `unchanged`: —

## 6) Sécurité

- Validation entrées: n/a
- Secrets: aucun nouveau
- Policies RLS: inchangées

## 7) Observabilité

- Logs structurés: logger existant
- Tracing/Correlation: non implémenté

## 8) Plan d’action ≤ timebox

- Nettoyage/refactor immédiat: déplacer script seed en migration
- Actions différées (ticket backlog): n/a

---

> ⚠️ Ce fichier doit être complété **au début du sprint**. Les hooks Husky bloquent le commit si `schema.sql` n’est pas **rafraîchi** ou noté `unchanged` justifié.
