# PREFLIGHT — Sprint S<N>

> Audit rapide **avant implémentation** : **code** + **base de données**. À remplir au début du sprint, puis complété au gel **T+22**.

---

## 1) Portée & US concernées

* **Sprint** : S<N>
* **US ciblées** : \[US-XX, US-YY]
* **Modules / packages impactés** : …
* **Environnements** : local / stage / prod (cibles : …)

---

## 2) Code audit (existant)

### 2.1 Cartographie

* Endpoints / handlers concernés : …
* Contrats / DTO existants : …
* Services / Repositories / UseCases : …

### 2.2 Hygiène & dette

* [ ] Doublons identifiés : … → action : supprimer / fusionner
* [ ] **Code mort / obsolète** : … → action : supprimer
* [ ] TODO / FIXME / Feature flags : … → action : clôturer / documenter
* [ ] Journalisation & erreurs : logs structurés, niveaux cohérents (ok / à corriger)
* [ ] Sécurité : validation entrée, secrets absents, PII non loggées (ok / à corriger)

### 2.3 Décisions de refactor (≤ timebox)

* Refactor minimal 1 : …
* Refactor minimal 2 : …

---

## 3) DB audit (existant)

### 3.1 État actuel

* Tables / colonnes / contraintes concernées : …
* Index utiles / manquants : …
* Fonctions / procédures : …
* **RLS / Policies** par rôle (admin, parc, prestataire, customer) : …

### 3.2 Écarts & migrations

* Écarts vs besoins US : …
* Migrations envisagées (TL;DR) : …

---

## 4) `schema.sql` (snapshot schéma)

* **RefreshedAt** : `YYYY-MM-DDThh:mm:ss±TZ` **ou** `unchanged` (justifier ci-dessous)
* Justification si `unchanged` : …
* **Commandes (à exécuter par le PO si impossible dans cet environnement)**

  * Postgres / Supabase

    ```bash
    supabase db dump --schema public -f schema.sql
    ```
  * SQL Server

    ```bash
    sqlpackage /Action:Export /SourceConnectionString:"<...>" /TargetFile:schema.sql
    ```

---

## 5) Plan d’action minimal du sprint

* **Nettoyages immédiats (safe)** : …
* **Refactors limités (≤ timebox)** : …
* **Migrations à produire** : …
* **Tests à ajouter** : unit / intégration / E2E / RLS : …

---

## 6) Risques & gardes‑fous

* Risque 1 : … → **Mitigation** : …
* Risque 2 : … → **Mitigation** : …
* **Rollback** (base & code) : …

---

## 7) Artefacts impactés (à tenir à jour)

* `BACKLOG.md` (statuts US)
* `QUALITY-GATES.md` (si ajustements)
* `schema.sql` (snapshot) / migrations
* `/docs/sprints/S<N>/{PLAN.md, BOARD.md, DEMO.md, REVIEW.md, RETRO.md}`

---

## 8) Traçabilité

* Commits / PR : …
* Jeux de tests / rapports : …
* Logs / traces : …
