# PREFLIGHT — Sprint S10

## 1) Contexte

- **Sprint**: S10
- **Date**: 2025-09-05
- **Objectif**: audit existant avant implémentation

## 2) Code audit

- Doublons détectés: Aucun doublon majeur repéré
- Code mort/obsolète: RAS
- Refactors simples (≤ timebox): N/A

## 3) DB audit

- Tables/colonnes: schéma courant centré sur réservations/billets
- RLS/policies: existantes sur tables utilisateurs, à étendre pour billets
- Fonctions/procédures: fonctions de réservation à compléter
- Index/contraintes: uniques sur ids opaques requis

## 4) Migrations

- Nouvelles migrations prévues: ajout table reservations + flag used
- Rollback: prévu via scripts SQL inverses
- **Application**: par le PO après merge (ChatGPT ne lance pas la CLI DB)

## 5) Schéma SQL (`schema.sql`)

- **RefreshedAt**: 2025-09-08T17:00:00Z
- Ou justification `unchanged`:

## 6) Sécurité

- Validation entrées: contrôles côté client et serveur prévus
- Secrets: chargés via env, pas de secret en clair
- Policies RLS: à définir pour accès billets/réservations

## 7) Observabilité

- Logs structurés: à intégrer dans les fonctions serverless
- Tracing/Correlation: non appliqué pour le MVP

## 8) Plan d’action ≤ timebox

- Nettoyage/refactor immédiat: aucun
- Actions différées (ticket backlog): RLS et observabilité approfondies

---

> ⚠️ Ce fichier doit être complété **au début du sprint**. Les hooks Husky bloquent le commit si `schema.sql` n’est pas **rafraîchi** ou noté `unchanged` justifié.
