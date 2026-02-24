

## Plan de correction -- Migration complète vers `planning_affectations` comme source de vérité

---

### Résumé des 9 corrections par fichier

---

### 1. `useDashboardStats.ts` -- Stats dashboard cassées (CRITIQUE)

**Probleme** : La "Progression transmission" (L187) compte les chantiers actifs ayant un `chef_id` pour calculer le total d'equipes. Comme `chef_id` est maintenant `null`, le total est 0 et le pourcentage est casse.

**Correction** : Remplacer `chantiersActifsAvecChef` par une requete sur `planning_affectations` pour la semaine courante : on recupere les `chantier_id` distincts qui ont au moins un employe planifie. Pour les "chantiers orphelins" (L164), retirer le check `!c.chef_id` et ne garder que le check `!chantiersAvecChefSet.has(c.id)` (qui utilise deja `affectations_jours_chef`).

---

### 2. `useFiches.ts` -- Filtre "par chef" casse en validation conducteur (CRITIQUE)

**Probleme** : Quand un conducteur filtre les fiches par chef (L162-167), le code cherche `chantiers.chef_id = filters.chef`. Avec `chef_id` vide, ce filtre ne retourne plus rien.

**Correction** : Remplacer la requete `chantiers.chef_id` par une requete sur `affectations_jours_chef` pour trouver les `chantier_id` distincts ou le chef est affecte dans la semaine filtree (ou toutes les semaines si pas de filtre semaine).

---

### 3. `ChefMaconsManager.tsx` -- Retirer la gestion d'equipe par le chef (HAUTE)

**Decision utilisateur** : Le chef ne doit plus pouvoir ajouter/retirer des membres. C'est le conducteur qui gere via le planning.

**Correction** :
- Transformer le bouton "Gerer mon equipe" en un bouton "Mon equipe" qui ouvre un dialog **en lecture seule** : on voit l'equipe actuelle (noms, roles, jours) mais sans boutons "Ajouter", "Retirer", "Dissoudre", "Transferer".
- Retirer les imports et hooks : `useAffectations`, `useCreateAffectation`, `useUpdateAffectation`, `useDeleteFichesByMacon`, `useDissoudreEquipe`, `useTransfererEquipe`, `useChantiers`, `TeamMemberCombobox`, `InterimaireFormDialog`.
- Retirer toute la logique : `handleAddMacon`, `handleRemoveMacon`, `isMaconInTeam`, `getMaconStatus`, les 4 colonnes "AJOUTER DES MACONS/GRUTIERS/INTERIMAIRES/FINISSEURS", les dialogs dissolution/transfert.
- Garder uniquement : affichage de l'equipe actuelle (via `useMaconsByChantier`) + affichage des jours (via `affectationsJoursChef`) + le `DaysSelectionDialog` en lecture seule.

---

### 4. `useTransfererEquipe.ts` -- Supprimer (HAUTE)

**Decision utilisateur** : Le transfert d'equipe n'a plus de sens puisque c'est le conducteur qui compose les equipes via le planning.

**Correction** : Supprimer le fichier. L'import dans `ChefMaconsManager` est deja retire au point 3.

---

### 5. `useDissoudreEquipe.ts` -- Supprimer (HAUTE)

**Decision utilisateur** : Meme logique, la dissolution n'a plus de sens.

**Correction** : Supprimer le fichier. L'import dans `ChefMaconsManager` est deja retire au point 3.

---

### 6. `usePlanningMode.ts` -- Supprimer dead code (MOYENNE)

**Constat** : Ce hook n'est importe nulle part dans l'application.

**Correction** : Supprimer le fichier.

---

### 7. `ChantierSelector.tsx` -- Pas de changement

Le fallback `chantiers.chef_id` (L38) n'est atteint que quand `semaine` est absent, ce qui ne se produit pas dans le flux chef (toujours une semaine selectionnee). Ce code sert potentiellement a d'autres contextes. On le laisse tel quel.

---

### 8. Panels admin (`MaconsManager`, `GrutiersManager`, `InterimairesManager`, `FinisseursManager`, `ChefsManager`) -- Migrer vers `planning_affectations` (BASSE)

**Probleme** : Ces panels utilisent `useAffectations()` (table legacy) pour afficher le "chantier actuel" d'un employe. Les donnees sont potentiellement obsoletes.

**Correction** : Remplacer `useAffectations()` par une requete sur `planning_affectations` pour la semaine courante. Afficher le chantier planifie cette semaine au lieu de l'affectation statique. Si un employe est planifie sur plusieurs chantiers, afficher le principal.

Pour `MaconsManager` et `GrutiersManager` qui utilisent aussi `useCreateAffectation` pour le bouton "Affecter" dans l'admin : retirer ce bouton car l'affectation se fait via le planning. Garder uniquement l'affichage.

---

### 9. `CongesListSheet.tsx` -- Migrer le filtre employes (BASSE)

**Probleme** : Le filtre "employes sans affectation" (L82-100) utilise la table legacy `affectations` pour savoir qui est dans une equipe.

**Correction** : Remplacer la requete `affectations.date_fin IS NULL` par une requete sur `planning_affectations` pour la semaine courante, afin d'identifier les employes actuellement planifies sur un chantier.

---

### Fichiers crees / supprimes

| Action | Fichier |
|--------|---------|
| Supprimer | `src/hooks/useDissoudreEquipe.ts` |
| Supprimer | `src/hooks/useTransfererEquipe.ts` |
| Supprimer | `src/hooks/usePlanningMode.ts` |

### Fichiers modifies

| Fichier | Nature du changement |
|---------|---------------------|
| `src/hooks/useDashboardStats.ts` | Requete planning_affectations au lieu de chantiers.chef_id |
| `src/hooks/useFiches.ts` | Filtre chef via affectations_jours_chef au lieu de chantiers.chef_id |
| `src/components/chef/ChefMaconsManager.tsx` | Refonte majeure : lecture seule, suppression ajout/retrait/dissolution/transfert |
| `src/components/admin/MaconsManager.tsx` | useAffectations -> planning_affectations, retrait bouton "Affecter" |
| `src/components/admin/GrutiersManager.tsx` | useAffectations -> planning_affectations, retrait bouton "Affecter" |
| `src/components/admin/InterimairesManager.tsx` | useAffectations -> planning_affectations |
| `src/components/admin/FinisseursManager.tsx` | useAffectations -> planning_affectations |
| `src/components/admin/ChefsManager.tsx` | useAffectations -> planning_affectations |
| `src/components/conges/CongesListSheet.tsx` | affectations -> planning_affectations |

### Ce qui ne change PAS

- Aucune modification de schema BDD
- La table `affectations` reste en BDD (pas de suppression de table)
- Le hook `useAffectations.ts` reste dans le code (mais ne sera plus importe apres migration)
- Les pages `/planning-main-oeuvre`, `/validation-conducteur`, `/consultation-rh`, `/signature-*` ne sont pas touchees
- La sync du lundi (`sync-planning-to-teams`) n'est pas modifiee

