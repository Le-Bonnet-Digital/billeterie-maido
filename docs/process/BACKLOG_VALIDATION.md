# Validation du backlog

Ce document décrit les règles que doit vérifier le script `npm run validate:backlog` pour s’assurer que toutes les user stories (US) prêtes à être sélectionnées respectent la *Definition of Ready* (DoR).

## Règles de validation

Pour chaque US avec `status: Ready` dans `BACKLOG.md` :

- **Persona** : un rôle utilisateur est défini (ex. “En tant que spectateur…”).
- **Title** : le titre est concis et compréhensible.
- **Value** : l’objectif métier de l’US est expliqué.
- **Priority** : une priorité (`P0`, `P1`, `P2`, etc.) est indiquée.
- **Story points (sp)** : le champ `sp` est vide avant estimation.
- **Critères d’acceptation (AC)** : au moins deux AC sont présents.
- **Note de sécurité/RLS** : un commentaire sur la sécurité ou les politiques RLS est inclus.
- **links.api** : pour les US générées automatiquement (`origin: auto`), un champ `links.api` renvoie vers le contrat d’API ou indique un `placeholder`.

## Usage

Le script de validation doit parcourir `BACKLOG.md`, lister les US `Ready` et afficher les éventuelles erreurs. Une US ne respectant pas la DoR ne doit pas être sélectionnée au sprint.
