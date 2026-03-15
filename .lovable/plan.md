## Plan : Fix bug "Principal/Secondaire" des chefs multi-chantiers — IMPLÉMENTÉ ✅

### Problème
Le `chantier_principal_id` (stocké globalement dans `utilisateurs`) devenait obsolète quand un chef changeait de chantiers d'une semaine à l'autre, causant l'affichage "Secondaire" sur tous ses chantiers.

### Corrections apportées

1. **Sync Edge Function** (`sync-planning-to-teams`) : Auto-recalcul du `chantier_principal_id` pour les chefs multi-chantiers quand la valeur actuelle ne correspond à aucun de leurs chantiers de la semaine (chantier avec le plus de jours).

2. **UI Planning** (`PlanningMainOeuvre.tsx`) : Ajout du hook `useChefsWithPrincipalResolved` qui recalcule localement le badge Principal/Secondaire en fallback quand la valeur DB est incohérente avec les affectations de la semaine.

3. **Copy from previous week** (`usePlanningAffectations.ts`) : Invalidation du cache `chefs-chantier-principal` après copie.

4. **Add/Remove chef** (`PlanningMainOeuvre.tsx`) : Vérification et mise à jour du `chantier_principal_id` lors de l'ajout/retrait d'un chef d'un chantier.
