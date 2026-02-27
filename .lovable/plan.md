

## Correction du bug — stopPropagation sur les checkboxes jours

### Changement unique

**Fichier** : `src/components/planning/AddEmployeeToPlanningDialog.tsx`

**Ligne ~450** : Ajouter `onClick={(e) => e.stopPropagation()}` sur le `<div>` conteneur des checkboxes jours :

```tsx
<div 
  className="mt-3 pt-3 border-t flex items-center gap-4"
  onClick={(e) => e.stopPropagation()}  // ← seul ajout
>
```

Aucun autre fichier modifié. Aucune logique métier impactée.

