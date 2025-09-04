# BOARD — Sprint S1

## 1) Métadonnées

- **Sprint**: S1
- **Branche**: `work`
- **Timebox**: 25 min (gel **T+22**)

## 2) Kanban du sprint

> Déplacer les US sélectionnées dans la colonne correspondante. Chaque transition doit être justifiée dans les artefacts sprint.

| ID    | Title                     | SP  | Owner    | Status   |
| ----- | ------------------------- | --- | -------- | -------- |
| US-10 | Parcourir offres & passes | 3   | frontend | Selected |
| US-11 | Panier + CGV              | 3   | frontend | Selected |

## 3) Légende statuts

- **Selected**: choisi dans le plan, pas encore commencé
- **InSprint**: en cours d’implémentation (A→B→C→D)
- **Done**: terminé et validé QA (prêt PR)
- **Spillover**: non terminé, reporté

## 4) Notes

- Chaque US doit avoir `sp`, `owner`, `origin`, `type`, `links.api` si `origin:auto`
- Le hook Husky bloque si une US `origin:auto` est `Done` **sans** `links.api` ou **<2 AC** ou **pas de note sécurité/RLS**
- Les transitions doivent être cohérentes avec `BACKLOG.md`
