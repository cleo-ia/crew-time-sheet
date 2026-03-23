

## Plan appliqué ✅ — copyFichesFromPreviousWeek supprimée, statuts protégés

### Modifications effectuées dans `supabase/functions/sync-planning-to-teams/index.ts`

1. **Fetch S-1 supprimé** — Plus de requêtes `affectationsS1Chef` / `affectationsS1Finisseurs`, plus de map `s1ByEmployeChantier`
2. **Statuts protégés dans le bloc chef secondaire** — `STATUTS_PROTEGES` étendu à `['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']`, avec création des affectations équipe même sur fiche protégée
3. **Branchement copy/create remplacé** — Appel direct à `createNewAffectation` dans tous les cas
4. **Statuts protégés dans `createNewAffectation`** — Les fiches signées/transmises/clôturées ne sont plus écrasées, seules les affectations équipe sont créées
5. **`copyFichesFromPreviousWeek` et `arraysEqual` supprimées** — Code mort retiré
6. **Plus de forçage `statut: 'BROUILLON'`** — Le bloc chef secondaire ne force plus le statut lors du update total_heures

### Migration DB déjà appliquée

Contrainte unique `affectations_jours_chef` changée de `(macon_id, jour)` à `(macon_id, jour, chantier_id)`.
