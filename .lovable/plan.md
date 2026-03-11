

## Plan : Tri par date et filtre par mois pour les absences longue duree

### Fichier modifie

`src/components/conges/AbsencesLongueDureeSheet.tsx`

### Modification 1 : Tri par date de debut croissante

Actuellement les absences sont triees par `created_at DESC` cote Supabase (dans le hook `useAbsencesLongueDuree`). Modifier le hook pour trier par `date_debut ASC`.

**Fichier** : `src/hooks/useAbsencesLongueDuree.ts`, ligne 36

```typescript
// Avant
.order("created_at", { ascending: false });
// Apres
.order("date_debut", { ascending: true });
```

### Modification 2 : Filtre par mois

Dans `AbsencesLongueDureeSheet.tsx` :

1. Ajouter un state `selectedMonth` (defaut `"all"`)
2. Calculer les mois uniques a partir des `date_debut` de toutes les absences (actives + terminees), tries chronologiquement
3. Ajouter un `Select` avec icone `CalendarDays` entre le header et les tabs (visible si plus d'un mois)
4. Filtrer `actives` et `terminees` selon le mois selectionne avant le rendu
5. Les compteurs dans les onglets et le badge du header refletent les donnees filtrees

Le filtre s'applique sur `date_debut.startsWith(selectedMonth)`, meme pattern que celui implemente dans `CongesRHSheet.tsx`.

2 fichiers modifies, environ 30 lignes ajoutees.

