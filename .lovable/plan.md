

## Ajouter les indicateurs jour pour les employés "sans chef"

### Probleme
Les indicateurs de jours (L M M J V) ne s'affichent pas pour les employés sur des chantiers sans chef. Le hook `useFicheBlockDetail` ne requête que `affectations_jours_chef` pour récupérer les jours. Pour les chantiers sans chef, les affectations sont dans `affectations_finisseurs_jours`.

### Solution

**Fichier : `src/hooks/useFicheBlockDetail.ts`**

1. Ajouter une requête vers `affectations_finisseurs_jours` en parallèle de celle sur `affectations_jours_chef` :
   ```ts
   const { data: allAffectationsFinisseurs } = await supabase
     .from("affectations_finisseurs_jours")
     .select("finisseur_id, chantier_id, date")
     .in("chantier_id", chantierIds)
     .eq("semaine", semaine);
   ```

2. Collecter les `finisseur_id` dans `allUserIds` et `teamMemberIds`

3. Lors de la construction de `memberJours`, fusionner les deux sources :
   - Jours depuis `affectations_jours_chef` (filtre `macon_id`)
   - Jours depuis `affectations_finisseurs_jours` (filtre `finisseur_id`)
   - Dédupliquer et trier

### Fichiers modifies

| Fichier | Changement |
|---|---|
| `src/hooks/useFicheBlockDetail.ts` | Requête `affectations_finisseurs_jours` + fusion des jours |

### Resultat attendu
Les indicateurs L M M J V apparaissent aussi pour les employés sur des chantiers sans chef (affectés via le conducteur).

