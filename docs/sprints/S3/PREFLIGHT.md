# PREFLIGHT — Sprint S3

## 1) Contexte

- **Sprint**: S3
- **Date**: 2025-09-05
- **Objectif**: audit existant avant implémentation

## 2) Code audit

- Doublons détectés: aucun
- Code mort/obsolète: aucun relevé
- Refactors simples (≤ timebox): corriger fonction `get_passes_with_activities`

## 3) DB audit

- Tables/colonnes: colonne `guaranteed_runs` absente dans `passes`
- RLS/policies: inchangé, policies existantes suffisent
- Fonctions/procédures: `get_passes_with_activities` à réparer
- Index/contraintes: aucun impact

## 4) Migrations

- Nouvelles migrations prévues: ajout colonne `guaranteed_runs`
- Rollback: `ALTER TABLE passes DROP COLUMN guaranteed_runs;`
- **Application**: par le PO après merge (ChatGPT ne lance pas la CLI DB)

## 5) Schéma SQL (`schema.sql`)

- **RefreshedAt**: 2025-09-05T00:55:18Z

## 6) Sécurité

- Validation entrées: aucune nouvelle entrée
- Secrets: aucun
- Policies RLS: pas d'ajout, vérifier existantes

## 7) Observabilité

- Logs structurés: logger centralisé existant
- Tracing/Correlation: non applicable

## 8) Plan d’action ≤ timebox

- Nettoyage/refactor immédiat: mise à jour migration + schéma
- Actions différées (ticket backlog): tests supplémentaires RLS

---

> ⚠️ Ce fichier doit être complété **au début du sprint**. Les hooks Husky bloquent le commit si `schema.sql` n’est pas **rafraîchi** ou noté `unchanged` justifié.
