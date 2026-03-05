

## Retrait du filtre Conducteur de la vue RH

### Modifications

**1. `src/components/rh/RHFilters.tsx`**
- Supprimer l'import `Briefcase` de lucide-react
- Supprimer l'import `useUtilisateursByRole` et le hook `const { data: conducteurs } = useUtilisateursByRole("conducteur")`
- Supprimer le bloc JSX du filtre Conducteur (lignes 129-155)
- Ajuster la grille : `lg:grid-cols-6` → `lg:grid-cols-5`
- Supprimer `conducteur` de l'interface `RHFiltersProps.filters`

**2. `src/pages/ConsultationRH.tsx`**
- Supprimer `conducteur: "all"` de l'état initial des filtres (ligne 63)

### Pas touché (zéro régression)
- `rhShared.ts` : le guard `if (filters.conducteur && filters.conducteur !== "all")` ne s'exécutera jamais → aucun changement de comportement
- `useRHData.ts` : idem, les guards protègent déjà
- `useFiches.ts` : utilise ses propres filtres (page Validation), pas les filtres RH
- Export Excel, clôture, vue consolidée : tous passent par les mêmes guards

