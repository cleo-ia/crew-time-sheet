

## Fix : appliquer le filtre semaine à la vue détail agence

**Fichier : `src/pages/RapprochementInterim.tsx`**

**Problème** : Ligne 185, la vue détail agence filtre sur `employees` (données complètes du mois) au lieu de `employeesFiltered` (données filtrées par semaine).

**Correction** : Remplacer `employees` par `employeesFiltered` à la ligne 185 :

```tsx
// Avant
const agenceEmployees = employees.filter(
  (emp) => (emp.agence_interim || "Sans agence") === selectedAgence
);

// Après
const agenceEmployees = employeesFiltered.filter(
  (emp) => (emp.agence_interim || "Sans agence") === selectedAgence
);
```

Changement d'un seul mot, une seule ligne. Les totaux, accordéons et export suivront automatiquement.

