

## Supprimer la colonne "Maçons" du tableau des chefs

Retirer la colonne "Maçons" (header + cellules) du tableau dans `src/components/admin/ChefsManager.tsx` :

1. Supprimer le `<TableHead>Maçons</TableHead>` (ligne 210)
2. Supprimer le `<TableCell>` avec le badge `nbMacons` (lignes 263-265)
3. Mettre à jour les `colSpan` de 8 à 7 (lignes 216, 222)
4. Supprimer la fonction `getMaconsCount` et le hook `usePlanningAffectationsCurrentWeek` s'il n'est plus utilisé ailleurs dans ce fichier — en fait il est aussi utilisé par `getChantierForChef`, donc on le garde.

Aucun impact sur le reste de l'application.

