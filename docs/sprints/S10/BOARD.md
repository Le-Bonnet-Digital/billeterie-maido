# BOARD — Sprint S10

## 1) Métadonnées

- **Sprint**: S10
- **Branche**: `work`
- **Timebox**: 25 min (gel **T+22**)

## 2) Kanban du sprint

> Déplacer les US sélectionnées dans la colonne correspondante. Chaque transition doit être justifiée dans les artefacts sprint.

| ID     | Title             | SP  | Owner      | Start | End | Status    |
| ------ | ----------------- | --- | ---------- | ----- | --- | --------- |
| US-201 | Parcourir offres  | 1   | frontend   |       |     | Delivered |
| US-202 | Panier + CGV      | 1   | frontend   |       |     | Delivered |
| US-203 | Paiement Stripe   | 3   | serverless |       |     | Delivered |
| US-204 | Validation billet | 1   | serverless |       |     | Delivered |

## 3) Légende statuts

- **Selected**: choisi dans le plan, pas encore commencé
- **InSprint**: en cours d’implémentation (A→B→C→D)
- **Delivered**: terminé et validé QA (PR ouverte/mergée, en attente validation PO)
- **Spillover**: non terminé, reporté

## 4) Notes

- Chaque US doit avoir `sp`, `owner`, `origin`, `type`, `links.api` si `origin:auto`
- Le hook Husky bloque si une US `origin:auto` est `Delivered` **sans** `links.api` ou **<2 AC** ou **pas de note sécurité/RLS**
- Les transitions doivent être cohérentes avec `BACKLOG.md`
