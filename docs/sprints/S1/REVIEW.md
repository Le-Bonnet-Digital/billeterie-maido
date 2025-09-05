# REVIEW — Sprint S1

## 1) Contexte

- **Sprint**: S1
- **Date review**: 2025-09-04
- **Participants**: ChatGPT (équipe) + PO

## 2) Bilan du sprint

- **Capacité engagée**: 6 SP
- **SP livrés**: 6 SP
- **Focus factor**: 1.0 (livrés/engagés)
- **Temps par US**:
  - US-10: ~1m12
  - US-11: ~2m02

## 3) Objectifs atteints

- US-10 ❌ (fonction get_passes_with_activities absente)
- US-11 ❌ (non validée suite au bug précédent)

## 4) Dérogations / écarts

- Validation PO KO : erreur 404 sur `get_passes_with_activities`

## 5) Feedback PO

- Validation prod: KO — impossible d'afficher les passes
- Retours fonctionnels: vérification des créneaux impossible

## 6) Actions d’amélioration (reportées en rétro)

- Améliorer tests RLS prestataires
- Stabiliser webhook Stripe (retry/alerte)

## 7) Décisions

- Maintenir Stripe Checkout uniquement (pas d’autres moyens de paiement)
- Standardiser logs (format JSON + correlation)

## 8) Suivi

- PR merge: `Sprint S1: …`
- CHANGELOG mis à jour (`[Unreleased]`)
- Tickets follow‑up créés si besoin
- Fix à planifier : créer la fonction `get_passes_with_activities`
