

## Correction du bug d'affichage de l'historique

**Fichier modifié** : `src/components/admin/HistoriqueManager.tsx`

**Changement** : Stabiliser le résultat de `getDateRange()` avec `useMemo` pour que le `queryKey` de React Query ne change pas à chaque rendu.

Remplacer la ligne `const dateRange = getDateRange();` par `const dateRange = useMemo(() => getDateRange(), [period]);`

