# PO\_NOTES — Journal PO ⇄ Codex

## Règles d’usage

* Codex lit ce fichier **avant chaque tâche** et **après chaque PR**.
* Chaque interaction est **horodatée (ISO 8601)** et ajoutée dans **INTERACTIONS**.
* Le PO répond **dans la même liste** (OK/KO + détails). Codex adapte le backlog en conséquence.

## DECISIONS

* 2025-09-04 : Priorité P1 → Sprint 0 puis Sprint Utilisateur.

## NEW\_FEATURES (idées à convertir en US)

* \[IDEA] Ticket famille (2A+2E) tarif groupé.

## BLOCKERS

* Aucun.

## INTERACTIONS

```yaml
- who: Codex
  when: 2025-09-04T15:00:00+02:00
  topic: US-12 — Paiement + Confirmation
  ask: |
    Merci de vérifier en PROD :
    1) Achat d’un pass → Stripe → retour /success.
    2) Réception email avec n° de réservation + QR.
    3) Paiement visible dans Dashboard Stripe.
  context: PR #123, env: https://stage.example.app
  status: pending

- who: PO
  when: 2025-09-04T16:20:00+02:00
  reply: KO
  details: |
    1) Redirection OK.
    2) Email non reçu (vérifié spam). Log 500 sur l’envoi.
  action: fix

- who: Codex
  when: 2025-09-04T17:10:00+02:00
  topic: US-12 — Fix email
  ask: |
    Refaire un achat en PROD et confirmer réception email (<1 min). Si échec, indiquer heure exacte.
  context: PR #124, change: retry + log provider
  status: pending
- who: Codex
  when: 2025-09-04T17:30:00+02:00
  topic: US-00 — Paiement Stripe + webhook idempotent
  ask: |
    Tester un paiement simple et vérifier qu'aucune double réservation n'est créée si le webhook est rejoué.
  context: PR TBD, env: https://stage.example.app
  status: pending
```

## FORMAT (à recopier)

```yaml
- who: Codex|PO
  when: <YYYY-MM-DDThh:mm:ss±hh:mm>
  topic: <US-XX — titre>                # Codex uniquement
  ask: |                                # Codex → ce que le PO doit tester en prod
    <liste courte d’étapes>
  context: PR #<id>, env: <url>, change: <optionnel>
  status: pending|resolved              # Codex met à jour

- who: PO
  when: <ISO>
  reply: OK|KO
  details: |
    <observations / bugs / demandes>
  action: next|fix|new-US               # instruction à Codex
```
