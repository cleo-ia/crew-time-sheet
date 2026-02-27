

## Fix : InterimaireExportDialog doit respecter le filtre agenceInterim

### Problème
Dans `src/components/rh/InterimaireExportDialog.tsx`, le `useEffect` (lignes 131-199) récupère **toutes** les agences depuis la table `utilisateurs`, puis itère sur chacune pour charger les données. Le filtre `filters.agenceInterim` passé en props est ignoré lors de cette étape de découverte des agences.

### Solution
Dans le `useEffect`, après avoir récupéré les agences uniques (ligne 154), filtrer la liste si `filters.agenceInterim` est défini :

**Fichier : `src/components/rh/InterimaireExportDialog.tsx`**

Après la ligne 154 (`const uniqueAgences = [...]`), ajouter :

```ts
// Si un filtre agence est défini, ne garder que cette agence
const agencesToProcess = filters.agenceInterim 
  ? uniqueAgences.filter(a => a === filters.agenceInterim)
  : uniqueAgences;
```

Puis remplacer `uniqueAgences` par `agencesToProcess` dans la boucle `for` de la ligne 161 :

```ts
for (const agence of agencesToProcess) {
```

### Résultat
- Depuis la vue détail agence (ex: ADEQUAT), le dialogue ne montrera que ADEQUAT avec le filtre semaine
- Depuis la vue principale, le dialogue continuera de montrer toutes les agences comme avant

