

## Fix : Supprimer le faux statut "Absent / À qualifier" pour chef multi-site filtré

### Problème
Ligne 970 de `useRHData.ts` : quand un chef a un `fiches_jours` sur le site filtré avec 0h (initialisation secondaire), `isAbsent` est mis à `true`. Cela déclenche l'affichage "Absent" + "À qualifier" dans le détail et bloque l'export. Or le chef n'est pas absent — il travaille sur un autre site.

### Correction — `src/hooks/useRHData.ts`

**Ligne 970** : dans le bloc `else if (hasAnyFicheOnFilteredSite)`, le chef a des heures sur un autre site. Il faut vérifier si le chef a travaillé ailleurs avant de le déclarer absent :

```typescript
// Ligne 970 — remplacer :
jour.isAbsent = hoursOnFilteredSite === 0 && intemperiesOnFilteredSite === 0;

// Par :
const hasHoursOnOtherSite = joursForDate
  .filter(fj => !filteredChantierFicheIds.has(fj.fiche_id))
  .reduce((sum, fj) => sum + (Number(fj.heures) || Number(fj.HNORM) || 0), 0) > 0;
jour.isAbsent = hoursOnFilteredSite === 0 && intemperiesOnFilteredSite === 0 && !hasHoursOnOtherSite;
if (!jour.isAbsent) {
  jour.typeAbsence = null;
}
```

Même correction dans le **bloc ligne 944** (le `if` au-dessus) : ajouter `jour.typeAbsence = null;` après `jour.isAbsent = false;` pour être cohérent.

### Résultat
Quand on filtre DAVOULT et que BOUILLET a 0h sur DAVOULT mais 7h sur MAILLARD → le jour affiche 0h **sans** badge "Absent" ni "À qualifier".

