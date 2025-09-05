# PREFLIGHT — Sprint S9

## 1) Contexte

- **Sprint**: S9
- **Date**: 2025-09-05
- **Objectif**: audit existant avant implémentation

## 2) Code audit

- Doublons détectés: aucun repéré
- Code mort/obsolète: à investiguer ultérieurement
- Refactors simples (≤ timebox): néant

## 3) DB audit

- Tables/colonnes: OK
- RLS/policies: à compléter avec US-01
- Fonctions/procédures: réserve_slot à créer
- Index/contraintes: vérifier index slot_id

## 4) Migrations

- Nouvelles migrations prévues: ajout policies et fonction reserve_slot
- Rollback: scripts inverses à fournir
- **Application**: par le PO après merge (ChatGPT ne lance pas la CLI DB)

## 5) Schéma SQL (`schema.sql`)

- **RefreshedAt**: unchanged — aucune modif BDD dans ce sprint

## 6) Sécurité

- Validation entrées: via Zod/DTO existants
- Secrets: aucun
- Policies RLS: renforcer avec US-01

## 7) Observabilité

- Logs structurés: à compléter pour Stripe webhook
- Tracing/Correlation: aucune mise à jour

## 8) Plan d’action ≤ timebox

- Nettoyage/refactor immédiat: aucun
- Actions différées (ticket backlog): documenter index manquants

---

> ⚠️ Ce fichier doit être complété **au début du sprint**. Les hooks Husky bloquent le commit si `schema.sql` n’est pas **rafraîchi** ou noté `unchanged` justifié.
