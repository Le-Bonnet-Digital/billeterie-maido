# BOARD — Sprint S7

## 1) Métadonnées

- **Sprint**: S7
- **Branche**: `work`
- **Timebox**: 25 min (gel **T+22**)

## 2) Kanban du sprint

> Déplacer les US sélectionnées dans la colonne correspondante. Chaque transition doit être justifiée dans les artefacts sprint.

| ID     | Title                 | SP  | Owner    | Start    | End      | Status    |
| ------ | --------------------- | --- | -------- | -------- | -------- | --------- |
| US-100 | Utilitaire parsePrice | 5   | frontend | 00:00:00 | 00:10:00 | Delivered |
| US-101 | Utilitaire formatDate | 5   | frontend | 00:00:00 | 00:15:00 | Delivered |
| US-102 | Utilitaire slugify    | 5   | frontend | 00:05:00 | 00:18:00 | Delivered |
| US-103 | Utilitaire clamp      | 5   | frontend | 00:10:00 | 00:20:00 | Delivered |

## 3) Légende statuts

- **Selected**: choisi dans le plan, pas encore commencé
- **InSprint**: en cours d’implémentation (A→B→C→D)
- **Delivered**: terminé et validé QA (PR ouverte/mergée, en attente validation PO)
- **Spillover**: non terminé, reporté

## 4) Notes

- Chaque US doit avoir `sp`, `owner`, `origin`, `type`, `links.api` si `origin:auto`
- Le hook Husky bloque si une US `origin:auto` est `Delivered` **sans** `links.api` ou **<2 AC** ou **pas de note sécurité/RLS**
- Les transitions doivent être cohérentes avec `BACKLOG.md`
