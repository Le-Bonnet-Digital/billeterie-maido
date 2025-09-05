# PREFLIGHT — Sprint S7

## 1) Contexte

- **Sprint**: S7
- **Date**: 2025-09-05
- **Objectif**: audit existant avant implémentation

## 2) Code audit

- Doublons détectés: aucun
- Code mort/obsolète: RAS
- Refactors simples (≤ timebox): n/a

## 3) DB audit

- Tables/colonnes: aucune modification
- RLS/policies: n/a
- Fonctions/procédures: n/a
- Index/contraintes: n/a

## 4) Migrations

- Nouvelles migrations prévues: aucune
- Rollback: n/a
- **Application**: par le PO après merge (ChatGPT ne lance pas la CLI DB)

## 5) Schéma SQL (`schema.sql`)

- **RefreshedAt**: unchanged (pas de changement BDD)

## 6) Sécurité

- Validation entrées: ajout parsePrice avec validation
- Secrets: aucun
- Policies RLS: n/a

## 7) Observabilité

- Logs structurés: n/a
- Tracing/Correlation: n/a

## 8) Plan d’action ≤ timebox

- Nettoyage/refactor immédiat: ajout utilitaires et tests
- Actions différées (ticket backlog): none

---

> ⚠️ Ce fichier doit être complété **au début du sprint**. Les hooks Husky bloquent le commit si `schema.sql` n’est pas **rafraîchi** ou noté `unchanged` justifié.
