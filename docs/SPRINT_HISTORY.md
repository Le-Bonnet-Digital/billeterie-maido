# SPRINT_HISTORY.md

Ce document décrit le format et les informations attendues pour l'historique des sprints. Les entrées de sprint elles‑mêmes sont consignées dans le fichier racine `SPRINT_HISTORY.md`.

## Format attendu

Chaque entrée doit être ajoutée à la fin du fichier racine après la clôture du sprint, en respectant les champs ci‑dessous :

- **Sprint :** numéro ou identifiant du sprint (ex. `S1`, `Sprint 5`).
- **Date :** date de fin du sprint.
- **committed_sp :** somme des points des US planifiées.
- **delivered_sp :** somme des points des US livrées et validées (statut `Delivered`).
- **Velocity :** ratio `delivered_sp / committed_sp`.
- **Notes :** observations importantes (difficultés rencontrées, améliorations notables).

## Exemple

```
Sprint : 4
Date : 2025-08-10
committed_sp : 8
delivered_sp : 5
Velocity : 0,62
Notes : Retard dû à des migrations bloquantes. La CI a révélé un manque de tests pour l’authentification.
```

La vélocité moyenne sur les trois derniers sprints doit être utilisée dans la phase d’estimation du sprint suivant.
