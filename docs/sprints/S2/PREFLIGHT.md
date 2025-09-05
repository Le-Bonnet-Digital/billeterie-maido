# PREFLIGHT — Sprint S2

## 1) Contexte

- **Sprint**: S2
- **Date**: 2025-09-05
- **Objectif**: audit existant avant implémentation

## 2) Code audit

- Doublons détectés: aucun
- Code mort/obsolète: fonction SQL manquante utilisée par le front
- Refactors simples (≤ timebox): ajout d'un logger centralisé

## 3) DB audit

- Tables/colonnes: RAS
- RLS/policies: existantes conformes
- Fonctions/procédures: `get_passes_with_activities` absent du schéma
- Index/contraintes: RAS

## 4) Migrations

- Nouvelles migrations prévues: création de `get_passes_with_activities`
- Rollback: `drop function if exists get_passes_with_activities(uuid);`
- **Application**: par le PO après merge (ChatGPT ne lance pas la CLI DB)

## 5) Schéma SQL (`schema.sql`)

- **RefreshedAt**: 2025-09-05T00:35:04+00:00

## 6) Sécurité

- Validation entrées: n/a
- Secrets: aucun
- Policies RLS: inchangées

## 7) Observabilité

- Logs structurés: ajout d'un logger simple
- Tracing/Correlation: n/a

## 8) Plan d’action ≤ timebox

- Nettoyage/refactor immédiat: migration + logger
- Actions différées (ticket backlog): améliorer coverage des tests RLS

---

> ⚠️ Ce fichier doit être complété **au début du sprint**. Les hooks Husky bloquent le commit si `schema.sql` n’est pas **rafraîchi** ou noté `unchanged` justifié.
