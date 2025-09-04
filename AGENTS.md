# AGENTS.md — Billeterie Maïdo (MVP, sprint timebox 25 min)

## 0) Objet
Manuel d’exécution pour **ChatGPT**. Quand on dit **« Passe au sprint suivant »**, ChatGPT crée son environnement isolé **sur la branche `work`**, lit ce fichier, puis exécute **un sprint timeboxé 25 minutes** en jouant tous les rôles (PM, Scrum Master, Serverless/Backend, Data, Front, QA, Code Review).  
👉 **Aucune autre branche ni autre environnement** ne doit être créé.

---

## 1) Contrats d’exécution
- **Branche** : unique, `work`.
- **PR** : **une seule PR en fin de sprint** → `work → main`, titre : `Sprint S<N>: <résumé>`.
- **Timebox** : 25 minutes. **Gel à T+22** pour finaliser docs/revue/rétro/PO_NOTES.
- **Autonomie produit** : si besoin, ChatGPT **propose, crée et sélectionne** les US nécessaires à l’atteinte du MVP avec **qualité irréprochable** (sans imposer de techno spécifique, mais en respectant l’architecture du repo).
- **Rôle du PO** : fournir **OK/KO**, **secrets/clé API**, et **orientations** dans `PO_NOTES.md`. Le PO **ne rédige pas** les US.
- **Qualité** : respecter `QUALITY-GATES.md` et `DoD.md`.
- **Sécurité** : pas de secrets en repo ; idempotence des opérations critiques ; **RLS/policies** testées ; en-têtes sécurité ; rate-limit sur endpoints publics.

---

## 2) Mode Sprint (commande : « Passe au sprint suivant »)
1) **Bootstrap & minuteur**
   - Démarrer un **minuteur interne 25 min** avec checkpoints **T+10** (mi-parcours) et **T+22** (gel).
   - Créer si absent `/docs/sprints/S<N>/` et initialiser : `PLAN.md`, `BOARD.md`, `DEMO.md`, `REVIEW.md`, `RETRO.md` à partir des templates.
2) **Intégrer review & rétro (apprentissage)**
   - Lire `PO_NOTES.md` → `SPRINT_HISTORY` & `RETRO/improvements`.  
   - Appliquer les améliorations (ajuster `QUALITY-GATES.md` si nécessaire).
3) **Collecte & grooming automatique**
   - Lire `BACKLOG.md` (US en `Ready`), `PO_NOTES.md/SPRINT_INPUT`, `README.md`, `DoD.md`, `QUALITY-GATES.md`.
   - **Si aucune US n’est `Ready`** :
     - Source 1 : `PO_NOTES.md/NEW_FEATURES` → **générer** des US.
     - Si vide/insuffisant : **discovery produit** → proposer des US **alignées MVP**, les consigner dans `PO_NOTES.md/NEW_FEATURES`, puis **créer** les US correspondantes dans `BACKLOG.md`.
     - Chaque US auto-générée doit contenir : `id`, `title`, `value`, `priority`, `type`, **≥ 2 AC**, **note sécurité/RLS**, `links.api` **placeholder**, `origin: auto`. Mettre `status: Ready`.
4) **Estimation & capacité**
   - Estimer chaque US en **story points** `sp ∈ {1,2,3,5,8,13}`.
   - **Vélocité** = moyenne des `delivered_sp` des **3 derniers sprints** (par défaut 8 si inconnu).
   - **Capacité engagée** = `floor(vélocité × 0.8)` ; réserver ~10 % aux **improvements** issus de la rétro.
5) **Planification**
   - Sélectionner des US jusqu’à la **capacité** ; marquer `status: Selected`, `sprint: N`, `sp: x` dans `BACKLOG.md` et refléter dans `/docs/sprints/S<N>/PLAN.md`.  
   - Initialiser `/docs/sprints/S<N>/BOARD.md` avec ces US en `Selected`.
6) **Exécution (A→B→C→D), sans PR intermédiaire**
   - Pour chaque US, avancer : `Selected` → `InSprint` → `Done` en passant les **gates** :  
     - **Gate A — Serverless/Backend** : contrats d’API/DTO validés (ex. Zod/FluentValidation), fonctions/handlers, **idempotence**, tests unit/inté, logs structurés.  
     - **Gate B — Data** : migrations versionnées + rollback, **RLS/policies** testées par rôle, index/contraintes, fonctions SQL atomiques + tests concurrence.  
     - **Gate C — Front** : UI responsive, i18n si prévu, Lighthouse a11y & perf ≥ 90, états *loading/empty/error/success*, VRT OK, intégration contrats.  
     - **Gate D — QA** : E2E (happy + 2 erreurs), tests rôle/RLS, test charge ciblé si critique, `QA_CHECKLIST.md` coché.
   - Mettre à jour `owner` de l’US (serverless → data → frontend → qa) et `/docs/sprints/S<N>/BOARD.md`.
   - Si dépassement de capacité/risque : basculer l’US en **`Spillover`** (report sprint suivant).
7) **Checkpoint T+22 (gel)**
   - **Geler le code**. Compléter `/docs/sprints/S<N>/{DEMO.md, REVIEW.md, RETRO.md}`.
   - Renseigner **`PO_NOTES.md/INTERACTIONS`** (entrée horodatée) avec les **tests prod** à exécuter pour valider/invalider le sprint.
8) **Clôture & PR unique**
   - Calculer `committed_sp` vs `delivered_sp`, puis écrire **`SPRINT_HISTORY`** (incl. focus factor) dans `PO_NOTES.md`.
   - Ouvrir **une PR unique** `work → main` intitulée `Sprint S<N>: <résumé>`.  
   - Après merge : marquer les US livrées en **`Merged`**.

---

## 3) Backlog — statuts & schéma d’US
- `status`: `Ready | Selected | InSprint | Done | Spillover | Merged`  
- `owner`: `serverless | data | frontend | qa` (réel rôle en cours)  
- `sp`: `1|2|3|5|8|13` — estimation story points  
- `sprint`: `<N|null>` — sprint planifié  
- `type`: `feature | improvement | fix`  
- `origin`: `po | auto` — source (PO ou auto-générée par ChatGPT)  
- `links.api`: chemin d’un **contrat d’API/DTO** (placeholder accepté si auto-générée)  

> Toute US **auto-générée** doit avoir **≥ 2 critères d’acceptation**, **une note sécurité/RLS**, et **`links.api`** (placeholder si besoin).

---

## 4) Garde-fous (PR bloquante si non respectés)
Avant merge, le workflow **`sprint-guard.yml`** doit vérifier :
1) Présence de `/docs/sprints/S<N>/{PLAN.md, BOARD.md, DEMO.md, REVIEW.md, RETRO.md}`.  
2) `PO_NOTES.md/INTERACTIONS` contient une entrée horodatée **pour S<N>** avec **tests prod** à exécuter.  
3) `BACKLOG.md` :
   - Chaque US **livrée** est en `Done` (les `Spillover` ne sont pas incluses en démo).  
   - Chaque US **auto-générée** (`origin: auto`), si en `Done`, possède **`links.api`**, **≥ 2 AC**, et une **note sécurité/RLS**.  
   - Chaque US `Done` a un `sp` et un `type`.  
4) `CHANGELOG.md` : section **[Unreleased]** résumant le contenu du sprint.  
5) **CI verte** (lint, build, tests, Lighthouse/perf si Front), couverture ≥ **80 %** des nouvelles lignes.

Si un garde-fou manque → **échec de la PR**.

---

## 5) Rôles & switching (rappel)
- ChatGPT joue **tous les rôles techniques** ; toi, **PO**, tu valides et fournis secrets/orientations.
- Ordre des rôles par US : **A (serverless)** → **B (data)** → **C (front)** → **D (qa)**.  
- `owner` de l’US reflète le rôle courant. Revenir à un rôle précédent si une gate échoue.

---

## 6) Journal PO & décisions
- À chaque sprint, ChatGPT ajoute une entrée **horodatée** dans `PO_NOTES.md/INTERACTIONS` avec :
  - `topic: Sprint S<N> — validation prod`
  - `ask:` étapes de test **simples et vérifiables**
  - `context:` env/URL utiles
- Le **PO** répond **OK**/**KO** (et fournit secrets/clé API si requis). ChatGPT adapte ensuite le backlog (fix/Spillover) et la capacité du sprint suivant (vélocité).

---

## 7) Dérogations
Toute dérogation (scope, qualité, sécurité) doit être :
- mentionnée dans `/docs/sprints/S<N>/REVIEW.md`, et
- ajoutée en **improvement** dans `PO_NOTES.md/RETRO` avec une action corrective planifiée.

---
