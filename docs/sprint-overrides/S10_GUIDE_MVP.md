# Guide de Référence — Sprint 10 (MVP Billetterie)

*(Ce sprint 1 est conçu pour délivrer rapidement un **MVP** exploitable, en se concentrant sur le parcours client d’achat de billets et la validation de base, tout en assurant un haut niveau de qualité logicielle.)*

## Objectif fonctionnel du Sprint 1 (Vision MVP)
**L’objectif principal** de ce Sprint 1 est de permettre à un client d’acheter des billets en ligne de bout en bout, et de poser les bases pour que le parc puisse valider ces billets à l’entrée. En d’autres termes, à la fin du sprint, un client doit pouvoir : 
- **choisir une offre** (pass/activité) dans le catalogue,
- **ajouter ses billets au panier** et fournir les informations nécessaires,
- **payer en ligne via Stripe**,
- **recevoir une confirmation de commande** (affichage de confirmation + email avec QR code du billet). 

En parallèle, le système doit permettre au personnel du parc de **vérifier la validité d’un billet** (via un scan ou une saisie du code QR) et de marquer ce billet comme utilisé. L’idée est de livrer un MVP fonctionnel couvrant le parcours client complet et le contrôle d’accès élémentaire, de façon à ce que la billetterie puisse être utilisée lors d’un événement réel minimal (même si tout n’est pas encore exhaustif côté administration ou fonctionnalités secondaires).

Cet objectif MVP apporte une **valeur métier immédiate** : le parc Maïdo pourrait commencer à vendre des billets en ligne et contrôler les entrées, ce qui est le cœur du besoin. Les aspects plus avancés (gestion fine des rôles, back-office complet, reporting) pourront être développés dans des sprints ultérieurs, une fois cette base solide posée.

## User Stories sélectionnées pour le Sprint 1

Voici les User Stories (US) retenues pour figer le périmètre du Sprint 1. Elles sont formulées du point de vue des utilisateurs clés (client, personnel du parc). Chacune inclut des **critères d’acceptation (CA)** clairs et testables :

### US1 : En tant que *client* du parc, je veux parcourir les **offres de billets et passes disponibles** afin de choisir ce que je veux acheter.
- **CA1.1 :** La page d’accueil ou catalogue affiche la **liste des passes/offres** disponibles avec pour chaque : un nom, un prix, une brève description, et la liste des activités incluses le cas échéant.  
- **CA1.2 :** Pour chaque offre, si certaines activités requièrent de réserver un créneau horaire, un **badge "Créneau requis"** apparaît clairement. Inversement, si l’accès est libre ou illimité, ceci est indiqué (badge "Accès libre" par ex.).  
- **CA1.3 :** Si aucune offre n’est disponible (catalogue vide), le site affiche un message d’information approprié (“Aucune offre disponible pour le moment”).

### US2 : En tant que *client*, je veux pouvoir **composer mon panier** en ajoutant ou retirant des billets, puis accepter les CGV afin de préparer ma commande avant paiement.
- **CA2.1 :** Depuis la liste des offres, je peux ajouter une ou plusieurs unités d’une offre à un **panier**. Le panier affiche le récapitulatif des articles avec quantités, et le **total mis à jour en temps réel** en fonction des ajouts/retraits.  
- **CA2.2 :** Avant de pouvoir cliquer sur “Payer” ou “Commander”, je dois obligatoirement cocher une case confirmant que j’accepte les **Conditions Générales de Vente (CGV)**. **Tant que cette case n’est pas cochée, le bouton de paiement est désactivé**.  
- **CA2.3 :** Les erreurs potentielles (par ex. tenter d’ajouter plus de billets que disponible, panier vide au moment de payer, etc.) sont gérées avec des messages clairs.

### US3 : En tant que *client*, je veux pouvoir **payer ma commande en ligne via Stripe** et recevoir une **confirmation** afin de finaliser mon achat et obtenir mes billets.
- **CA3.1 :** Depuis le panier, en cliquant sur “Payer”, le système initie le paiement via **Stripe Checkout**. Le client est redirigé vers la page de paiement Stripe avec le récapitulatif de sa commande. S’il annule/échoue, retour avec message d’échec et possibilité de réessayer. S’il paie avec succès, redirection vers **/success**.  
- **CA3.2 :** À l’issue d’un paiement réussi, le système enregistre la **commande/réservation** en base de données avec un statut payé (`PAID`) et les détails des billets, de façon **fiable et sans doublons** (idempotence via l’ID de session Stripe).  
- **CA3.3 :** Le client voit une **confirmation** (numéro de réservation) et reçoit un **email de confirmation** contenant : numéro de réservation, récapitulatif, et un **QR code** (identifiant opaque) pour la vérification à l’entrée.  
- **CA3.4 :** Si le paiement a échoué/annulé, pas d’email de confirmation et pas d’enregistrement de réservation.

### US4 : En tant que *employé du parc (agent de validation)*, je veux pouvoir **scanner ou saisir le code d’un billet** et vérifier sa validité afin d’admettre le client et éviter les fraudes.
- **CA4.1 :** Page “Validation” permettant **scan caméra** ou **saisie manuelle** d’un code/QR.  
- **CA4.2 :** Si valide & non utilisé → **succès** visible + marquage **utilisé** (persisté avec horodatage/opérateur).  
- **CA4.3 :** Si invalide/déjà utilisé → **erreur** explicite ; si déjà utilisé, afficher l’info de première validation.  
- **CA4.4 :** **Double utilisation impossible** (contrainte/flag en BDD + contrôle applicatif).

## Définition of Done du Sprint 1 
- **Tous les CA validés** (scénarios d’acceptation rejoués par un relecteur/PO).  
- **Qualité logicielle** : lint + build TS OK, **tests** (unitaires/integ) sur les zones critiques, couverture pertinente ; **tests existants verts**.  
- **Documentation minimale** mise à jour en fin de sprint (BACKLOG: US livrées, CHANGELOG: “Added…”, README si besoin, DEMO.md avec captures clés).  
- **Validation PO** explicite, après essais en conditions proches prod.  
- **Sécu & non-régression** : pas de secrets en clair, pas de PII en logs, idempotence Stripe, accessibilité & responsive, pas de code mort/dette introduite.

## Contraintes de qualité et processus pendant le sprint 
- **Tests systématiques** (TDD possible) sur chemins critiques : panier, idempotence webhook, validation billet (anti double-usage).  
- **Revue de code** obligatoire sur parties sensibles (paiement, email, validation).  
- **Intégration locale/CI hooks** actifs pour le code applicatif (lint/tests/format).  
- **Tests d’acceptation** manuels en staging (achat test Stripe → email → scan OK), avec preuves (captures) en DEMO.md.  
- **Sécurité** : QR **sans PII**, secrets via env, signature Stripe vérifiée, headers sécu raisonnables.  
- **Perf/UX** : états de chargement/erreur, responsive, score Lighthouse correct (perf & a11y), messages clairs.

**Ces bases saines permettront d’aborder les sprints suivants (ajout de fonctionnalités admin, améliorations, etc.) sans accumulation de dette technique et avec la confiance des parties prenantes.**
