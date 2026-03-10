

## Correction : Supprimer le double "Charger les données"

### Problème
La Hero Card dans `ExportPaie.tsx` masque `<RHPreExport>` derrière un état `dataLoaded`. Mais `RHPreExport` a son propre état interne `isDataLoaded` avec son propre bouton "Charger les données" (lignes 581-594). Résultat : double étape inutile.

### Solution
Ajouter une prop `autoLoad` à `RHPreExport`. Quand elle est `true`, le composant déclenche `loadData()` automatiquement au montage, sans afficher son écran intermédiaire.

### Modifications

**`src/components/rh/RHPreExport.tsx`**
- Ajouter `autoLoad?: boolean` à `RHPreExportProps`
- Ajouter un `useEffect` : si `autoLoad` est `true` et `!isDataLoaded && !isLoading`, appeler `loadData()`

**`src/pages/ExportPaie.tsx`**
- Passer `<RHPreExport filters={filters} autoLoad />` quand `dataLoaded` est `true`

Ainsi : Hero Card (clic) → `dataLoaded=true` → `RHPreExport` monte avec `autoLoad` → charge immédiatement les données → affiche le tableau directement.

