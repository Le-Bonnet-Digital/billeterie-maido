# CHANGELOG — Billeterie Maïdo

Toutes les modifications sont consignées ici. Suivre le format **Keep a Changelog**.

---

## \[Unreleased]

### Ajouté

- Catalogue des offres avec badges créneau
- Panier avec acceptation des CGV bloquant le paiement
- Paiement Stripe Checkout avec email QR et page de succès
- Validation des billets empêchant la double utilisation
- Utilitaires parsePrice, formatDate, slugify et clamp (US-100 à US-103)
- Script de calcul de vélocité (IMP-06)
- Aucun changement fonctionnel livré au sprint S9 (Spillover complet)

### Modifié

### Corrigé

- Renommage de la migration `extend_get_parc_activities_with_variants` et conversion du script de seed Luge en migration (US-23)

---

## \[Sprint S0] — YYYY-MM-DD

### Ajouté

- Setup projet (README, AGENTS.md, QUALITY-GATES.md, QA_CHECKLIST.md, BACKLOG.md, PO_NOTES.md)
- Husky pre-commit guard (.husky/pre-commit)
- Templates sprint (`/docs/templates/*`)
- `schema.sql` initial

### Modifié

- N/A

### Corrigé

- N/A

---

## \[Sprint S1] — 2025-09-04

### Ajouté

- Affichage des activités des passes avec badge "Créneau requis" (US-10)
- Panier: paiement désactivé tant que les CGV ne sont pas acceptées (US-11)

### Corrigé

- N/A

---

## \[Sprint S2] — 2025-09-05

### Ajouté

- Fonction `get_passes_with_activities` et logger `fetchPasses`

### Corrigé

- N/A

---

## \[Sprint S3] — 2025-09-05

### Ajouté

- Colonne `guaranteed_runs` pour les passes

### Corrigé

- N/A

---

## \[Sprint S4] — 2025-09-05

### Ajouté

- Vue `luge_validations_today` et page compteur Luge (US-21)

### Corrigé

- N/A

---

## \[Sprint S5] — 2025-09-05

### Ajouté

- Script de seed pour validations Luge (US-22)

### Modifié

### Corrigé

---
