

## Empêcher l'auto-save sur les semaines futures

### Problème
Après transmission d'une semaine, le chef est redirigé sur S+1 et l'auto-save crée des fiches BROUILLON parasites en BDD pour une semaine future non encore commencée.

### Modifications

**1. `src/hooks/useAutoSaveFiche.ts`**
- Ajouter un guard en début de `mutationFn` : si `weekId > getCurrentWeek()`, retourner `[]` sans écrire en BDD
- Import de `getCurrentWeek` depuis `weekUtils`

**2. `src/components/timesheet/TimeEntryTable.tsx`**
- Ajouter un guard dans l'effet auto-save (debounce) : ne pas déclencher `autoSaveFiche.mutate()` si la semaine sélectionnée est future
- Même guard sur le `visibilitychange` listener

### Impact
- Navigation en lecture sur S+1 toujours possible
- Aucune fiche parasite créée en avance
- Semaine courante et passées : aucun changement de comportement

