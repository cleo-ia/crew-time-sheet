
## Ce que j’ai compris (et confirmé en base)
- Dans le planning **SDER / 2026‑S07**, **BABAY** est bien affecté :
  - **Le Roseyran** : Lundi + Mardi (2 jours)
  - **Les Terrasses de Romanches** : Mercredi + Jeudi + Vendredi (3 jours)
- Pourtant, côté **Saisie hebdomadaire** sur **Le Roseyran**, BABAY affiche **39h**.

En base, on voit exactement pourquoi :
- `affectations_jours_chef` pour BABAY sur **Le Roseyran** contient bien **2 lignes** (09/02 et 10/02).
- Mais la fiche `fiches` de BABAY sur **Le Roseyran** a `total_heures = 39`.
- Et `fiches_jours` pour cette fiche contient **5 jours** (L→V), avec des écritures supplémentaires apparues après la synchro (timestamps plus tardifs).

Donc ce n’est pas un simple “affichage”: il y a eu **création de jours fantômes** dans `fiches_jours` pour ce chantier.

## Hypothèse racine (la vraie cause)
Il y a un scénario où l’application retombe en “mode legacy / jours autorisés = tous les jours” alors que le planning est pourtant validé. Deux causes probables (compatibles avec ce qu’on voit) :

1) **Détection “planning actif” dépend trop de `localStorage.current_entreprise_id`**  
   - `usePlanningMode` lit l’entreprise uniquement depuis `localStorage`.  
   - Si ce storage est manquant/incohérent (session admin, changement d’entreprise, reload pas fait, etc.), `usePlanningMode` renvoie `false` → legacy → tous les jours autorisés → total 39.

2) **Auto-save qui “fallback” à 5 jours si les affectations jours ne sont pas lisibles**  
   - `useAutoSaveFiche` (mutation) vérifie le planning actif via `planning_validations`, mais dépend aussi d’un `entrepriseId` local.
   - Si la lecture des `affectations_jours_chef` échoue/retourne vide, le code peut garder `selectedDays = Lundi..Vendredi` (fallback) et **upsert 5 jours**, créant les jours fantômes.

Objectif : rendre le système **impossible** à retomber en 5/5 jours quand le planning est validé.

---

## Changements prévus (code) — pour éliminer définitivement les “39h fantômes”
### A) Fiabiliser la détection “planning actif”
**Fichier : `src/hooks/usePlanningMode.ts`**
- Remplacer l’usage direct de `localStorage.getItem("current_entreprise_id")` par une source fiable :
  - utiliser `useCurrentEntrepriseId()` (déjà existant) pour récupérer l’entreprise via `localStorage` puis fallback `user_roles`.
- Ainsi, même si le localStorage est vide, le planning sera détecté comme actif dès que l’ID entreprise est résolu.

Résultat : `TimeEntryTable` n’affichera plus “legacy” à tort, donc les jours non affectés seront correctement exclus des totaux.

### B) Empêcher `useAutoSaveFiche` de créer des jours non affectés (zéro tolérance)
**Fichier : `src/hooks/useAutoSaveFiche.ts`**
1. Rendre la récupération `entrepriseId` robuste (même fallback que `useCurrentEntrepriseId`) à l’intérieur de la mutation :
   - Si `localStorage` est vide → requête `user_roles` pour récupérer `entreprise_id`.
2. En mode planning actif (planning_validations existe) :
   - Calculer `selectedDays` uniquement depuis `affectations_jours_chef` (maçons/grutiers/intérimaires) ou `affectations_finisseurs_jours` (finisseurs) selon le cas.
   - **Si aucune affectation jour n’est trouvée** pour le couple (employé, chantier, semaine) :
     - **ne pas fallback** à 5 jours,
     - au contraire : `selectedDays = []` et **aucun upsert** de `fiches_jours`.
3. Ajouter une étape “anti-jours fantômes” avant l’upsert (planning actif uniquement) :
   - Pour la fiche ciblée : supprimer `fiches_jours` dont la date n’est pas dans les jours assignés (`selectedDatesISO`).
   - Le trigger DB (déjà en place) recalculera automatiquement `fiches.total_heures`.

Résultat : même si l’UI se trompe, l’auto-save ne pourra plus écrire 39h quand il n’y a que 2 jours.

### C) Rendre la synchro Edge idempotente sur les jours (ceinture + bretelles)
**Fichier : `supabase/functions/sync-planning-to-teams/index.ts`**
Dans `createNewAffectation` :
- Après avoir upsert les jours `joursPlanning`, supprimer pour la fiche tout `fiches_jours` hors `joursPlanning`.
- Recalculer/mettre à jour le `total_heures` en se basant sur `joursPlanning` (ou laisser le trigger recalculer après suppressions).

Résultat : si une fiche “polluée” existait déjà (ou si un ancien bug l’a salie), la synchro remettra un état propre.

---

## Nettoyage des données existantes (pour tester “au propre” sans repurger toute la semaine)
Comme on a déjà un cas concret “BABAY + ROSEYRAN + S07”, je vais ajouter une action de “nettoyage automatique” via les suppressions ci-dessus :
- Dès que les correctifs sont en place, ouvrir la saisie hebdo / recharger déclenchera un auto-save qui peut corriger l’état (si on choisit d’exécuter le delete côté auto-save).
- Sinon (plus propre), on ajoute une petite routine de nettoyage dans la synchro (C) et il suffira de relancer la synchro après avoir invalidé/validé.

(Option si tu veux un bouton admin) : ajouter une action “Réparer la semaine (supprimer jours fantômes)” côté Admin, mais je ne le fais que si tu le souhaites.

---

## Tests à faire (checklist)
1) **S07 / SDER / Roseyran** : BABAY n’affiche plus 39h mais seulement les heures des jours affectés (L+M).
2) Vérifier que **les jours non affectés** apparaissent bien en “Jour non affecté” (gris/jaune selon UI) et non éditables.
3) Vérifier que BABAY sur **Romanches** affiche bien uniquement M/J/V.
4) Vérifier qu’un chef en mode normal (pas admin) peut toujours saisir, sauvegarder, signer.
5) Vérifier qu’un “profil admin” qui regarde une saisie ne provoque pas d’écriture parasite (auto-save inoffensif).

---

## Fichiers qui seront modifiés
- `src/hooks/usePlanningMode.ts` (fiabilisation entrepriseId)
- `src/hooks/useAutoSaveFiche.ts` (pas de fallback 5 jours + suppression jours fantômes + entrepriseId robuste)
- `supabase/functions/sync-planning-to-teams/index.ts` (nettoyage idempotent des jours hors planning)

---

## Risques / points d’attention
- Si une entreprise a des semaines “planning validé” mais **sans** `affectations_jours_chef`/`affectations_finisseurs_jours` générées (état incohérent), alors on choisit désormais de **ne rien écrire** plutôt que d’inventer 5 jours. C’est volontaire : ça évite les erreurs silencieuses.
- On s’appuie sur le trigger DB de recalcul `total_heures` après suppression : à valider en test (mais il est déjà mentionné ailleurs dans le projet).

