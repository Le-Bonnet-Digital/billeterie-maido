# DoD — Definition of Done

Pour qu’une fonctionnalité soit considérée **Done** :

## Qualité & tests

- Lint, type-check et tests (`npm test`) passent.
- Couverture ≥ 80 % des nouvelles lignes.
- Scénarios critiques (happy path + erreurs) couverts.
- Hook `.husky/pre-commit` vert.

## Documentation

- README et docs pertinentes (API, schéma, backlog) mis à jour.
- `CHANGELOG.md` et `PREFLIGHT.md` complétés si nécessaires.
- `schema.sql` rafraîchi ou `unchanged` justifié.

## Validation

- Critères d’acceptation remplis.
- `QA_CHECKLIST.md` coché.
- Entrée `docs/sprints/S<N>/INTERACTIONS.yaml` ajoutée et validée par le PO.

## Sécurité

- Aucun secret committé.
- RLS/policies et contrôles d’accès testés.
- Webhooks/logiciels idempotents.
