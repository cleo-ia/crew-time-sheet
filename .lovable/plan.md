

## Correctif : Filtrer la liste des utilisateurs selon le rôle sélectionné

**Fichier** : `src/components/admin/HistoriqueManager.tsx`

**Changement unique** : Modifier le `useMemo` de `uniqueUsers` pour qu'il se base sur `filteredModifications` au lieu de `modifications`. Ainsi, quand un rôle est sélectionné, seuls les utilisateurs ayant ce rôle apparaissent dans le dropdown.

Également, réinitialiser `userFilter` à `"all"` quand `roleFilter` change, pour éviter qu'un utilisateur filtré devienne invisible dans la liste.

