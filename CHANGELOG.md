# CHANGELOG — Billeterie Maïdo

Ce fichier suit le format *Keep a Changelog* et le versionnage sémantique.

## \[Unreleased]

* Initialisation des sprints et user stories (Sprint 0, Utilisateur, Parc, Prestataires, Admin)
* Ajout des fichiers d’orchestration : `AGENTS.md`, `BACKLOG.md`, `QA_CHECKLIST.md`, `PO_NOTES.md`
* Mise en place du workflow de synchronisation backlog/changelog

## \[0.1.0] - YYYY-MM-DD

* Démarrage du MVP :

  * Enablers : Stripe Checkout + webhook idempotent, Auth/Rôles + RLS, capacité/slots
  * Parcours client : offres → panier → paiement → confirmation → retrouver mon billet
  * Validation sur site : Luge, Poney, Tir à l’arc
  * Back-office admin : CRUD de base (événements/passes/slots), liste réservations + export, reporting simple

---

## Journal des merges (ajout automatique par workflow)

> Chaque merge de PR ajoute une ligne ci-dessous au format :
> `YYYY-MM-DD — US-XX: <titre> — Done via #<PR>`
