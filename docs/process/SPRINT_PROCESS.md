# Processus de sprint pour Codex

Ce document décrit en détail le déroulement d’un sprint de 25 minutes pour l’agent Codex. Il complète AGENTS.md et sert de référence opérationnelle.

## 1. Pré-sprint

1. Exécuter `npm run sprint:init` pour initialiser la structure `/docs/sprints/S/`.
2. Vérifier la mise à jour des dépendances (script d’installation) et s’assurer que la base de données et `schema.sql` sont synchronisés.
   - _Certaines validations peuvent être omises si elles ont déjà été effectuées récemment afin de réduire les opérations redondantes._
3. Lancer `npm run validate:backlog` pour vérifier que les US `Ready` respectent la DoR.
   - _(Si aucune US n’a le statut `Ready`, cette commande peut être passée.)_
4. Lire les fichiers `PO_NOTES.md` et `RETRO.md` du sprint précédent pour comprendre les orientations et améliorations à intégrer.
5. Reporter dans `PREFLIGHT.md` si `schema.sql` est déjà à jour (`unchanged`) plutôt que de recalculer un dump.

## 2. Pré‑vol (audit)

- **Code** : cartographier les endpoints, détecter le code mort, la dette technique et proposer des refactorings réalisables dans le timebox.
- **Base de données** : vérifier le schéma, les migrations, les politiques RLS et l’indexation. Noter dans `PREFLIGHT.md` l’état de `schema.sql` (date ISO ou `unchanged` avec justification).
- Documenter le pré‑vol dans `PREFLIGHT.md`.

## 3. Intégration du feedback

- Lire `INTERACTIONS.yaml` pour identifier les US `Delivered` validées (`OK`) et celles rejetées (`KO`). Les US en `KO` restent en `Delivered` jusqu’à correction.
- Ajuster le backlog, la vélocité et la capacité en conséquence.
- Mettre à jour les pratiques selon les remarques de `RETRO.md`.

## 4. Collecte et grooming automatique

- Parcourir `BACKLOG.md` pour sélectionner les US `Ready`.
- Générer des US supplémentaires à partir de `PO_NOTES.md` ou de la découverte produit si le backlog est vide.
- Vérifier la DoR pour chaque US générée (au moins deux critères d’acceptation, etc.).
- Classer les US selon la priorité et la capacité disponible.

## 5. Estimation et planification

- Estimer les US en points (`1,2,3,5,8,13`) et calculer la capacité (`vélocité × 0,8`).
- Sélectionner des US jusqu’à atteindre la capacité (en réservant ~10 % pour les improvements).
- Remplir `PLAN.md` et `BOARD.md` avec la liste des US sélectionnées, leurs spoints, leur type et l’ordre de passage par gate.
- Envoyer le plan via `INTERACTIONS.yaml` et attendre la validation du PO (`reply: OK`). Ne commencer l’exécution qu’une fois validé.
  - _Si le PO ne répond pas immédiatement, présumer l’accord et entamer l’exécution, en restant prêt à ajuster rétroactivement si besoin._

## 6. Exécution

- Pour chaque US sélectionnée :
  - _(Les gates peuvent être regroupées si pertinent : par exemple réaliser en une seule itération le backend et la migration associée.)_
  1. Passer par **Gate 0** : vérifier que `PREFLIGHT.md` est à jour et que `schema.sql` est justifié.
  2. **Gate A (serverless/backend)** : implémenter la logique serveur ou les endpoints.
  3. **Gate B (data)** : appliquer les migrations SQL, définir les policies RLS, créer les index/contraintes. Les migrations doivent être écrites mais jamais appliquées automatiquement (le PO les exécute).
  4. **Gate C (front)** : implémenter l’interface utilisateur ou les composants.
  5. **Gate D (QA)** : écrire et exécuter les tests unitaires et d’intégration, vérifier la couverture minimale (ex. 90 %), s’assurer que le linter et le type-check passent.

- Mettre à jour `BOARD.md` (statut et propriétaire). Si une US dépasse le timebox, la déplacer en `Spillover`.

## 7. Checkpoint T+22 (gel)

- Arrêter l’implémentation et finaliser systématiquement la documentation :
  - Compléter `DEMO.md` (instructions de test pour le PO).
  - Compléter `REVIEW.md` (temps par US, temps total de sprint, vélocité).
  - Compléter `RETRO.md` (ce qui a bien fonctionné, points à améliorer, actions correctives).
  - Vérifier que l’entrée de validation est prête dans `INTERACTIONS.yaml` (who: ChatGPT, status: pending) pour le PO.
  - Compléter `PREFLIGHT.md` si nécessaire.
  - Mettre à jour `INTERACTIONS.yaml` avec les questions de validation (ex. "Valider la fonctionnalité X en visitant l’URL suivante").
  - Mettre à jour `CHANGELOG.md` si des modifications notables ont été apportées.

## 8. Clôture et PR

- Calculer `committed_sp` (US planifiées) et `delivered_sp` (US livrées).
- Évaluer la vélocité et l’ajouter à `SPRINT_HISTORY.md`.
- Créer une PR unique (`work → main`) avec un message conforme (voir AGENTS.md).
- Après fusion, les US livrées passent en `Done` lors du sprint suivant si le PO les valide dans `INTERACTIONS.yaml`.

## 9. Gestion des exceptions

- Si un test échoue, corriger jusqu’à l’obtention d’un succès. Si cela dépasse le timebox, noter le problème dans `RETRO.md` et marquer l’US en `Spillover`.
- Si une migration ou une dépendance bloque l’avancement, marquer l’US en `Spillover`, documenter le problème dans `RETRO.md` et poursuivre avec les autres US. Demander l’intervention du PO via `INTERACTIONS.yaml` si nécessaire.
