## Plan : Planning = Source de vérité absolue — IMPLÉMENTÉ ✅

### Problème
La sync créait des fiches pour les nouveaux chantiers mais **protégeait** les anciennes fiches si elles avaient des heures ou un statut avancé, causant des doublons `(salarie_id, date)` sur des chantiers différents.

### Corrections apportées

1. **Protection réduite à `CLOTURE` uniquement** :
   - `STATUTS_PROTEGES` dans les 5 emplacements de la sync (chef secondaire, chef responsable secondaire, nettoyage chef, nettoyage finisseur, orphelines) réduits de `['VALIDE_CHEF', 'VALIDE_CONDUCTEUR', 'ENVOYE_RH', 'AUTO_VALIDE', 'CLOTURE']` à `['CLOTURE']`

2. **Suppression de la protection par heures** :
   - `copyFichesFromPreviousWeek` : au lieu de skip si `total_heures > 0`, supprime les `fiches_jours` existantes et les recrée selon le planning
   - `createNewAffectation` : même logique — écrase les heures existantes

3. **Phase anti-doublon post-sync** :
   - Détecte les collisions `(salarie_id, date)` sur des fiches de chantiers différents
   - Conserve la ligne dont le `chantier_id` correspond au planning
   - Supprime les doublons, recalcule `total_heures`, supprime les fiches vides

4. **Garde-fou frontend `rhShared.ts`** :
   - Pour les non-chefs avec doublons, exclut les entrées `A_COMPLETER` / `A_QUALIFIER` si une entrée avec un vrai code existe

### Fichiers modifiés
| Fichier | Nature |
|---------|--------|
| `supabase/functions/sync-planning-to-teams/index.ts` | Protection réduite à CLOTURE, écrasement heures, phase anti-doublon |
| `src/hooks/rhShared.ts` | Garde-fou déduplication non-chef |
