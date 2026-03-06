

## Plan : Ajout des fiches fantômes pour congés validés dans `sync-planning-to-teams`

### Fichier modifié

`supabase/functions/sync-planning-to-teams/index.ts`

### Modification

Insérer un nouveau bloc **après la ligne 1471** (après le `console.log` de fin des absences LD), juste avant le `return { results, stats }`.

Ce bloc est une copie quasi-identique du bloc absences LD (lignes 1347-1471), avec ces différences :

1. **Source** : `demandes_conges` au lieu de `absences_longue_duree`
2. **Filtre statut** : `.in('statut', ['VALIDEE_CONDUCTEUR', 'VALIDEE_RH'])`
3. **Filtre dates** : `.lte('date_debut', fridayStr).gte('date_fin', mondayStr)` (pas de `date_fin IS NULL` car les congés ont toujours une date de fin)
4. **Champ salarié** : `demandeur_id` au lieu de `salarie_id`
5. **Mapping type_conge → type_absence** :
   - `CP` → `CP`
   - `RTT` → `RTT`
   - `MALADIE` → `AM`
   - `AUTRE` → `CPSS`

### Logique identique au bloc LD

- Vérifier si une fiche ghost existe déjà (`salarie_id` + `chantier_id IS NULL` + `semaine` + `entreprise_id`) → si oui, **skip**
- Calculer les jours couverts (lun-ven) dans la semaine
- Créer la fiche ghost (`chantier_id: null`, `statut: ENVOYE_RH`, `total_heures: 0`)
- Créer les `fiches_jours` via `upsert` sur `(fiche_id, date)` avec `type_absence` mappé

### Ce qui ne change pas

- Le bloc absences longue durée reste intact
- `useInjectValidatedLeaves.ts` reste en filet de sécurité
- Réutilise les variables `mondayOfCurrentWeek`, `mondayStr`, `fridayStr`, `currentWeek`, `entrepriseId` déjà calculées

