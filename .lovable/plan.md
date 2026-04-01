

## Ajouter une colonne "Total" par chantier dans l'export Excel

### Problème
Actuellement chaque chantier a 3 colonnes (Bon, Nett., Rép.) mais pas de total par chantier. Le user veut une 4e colonne "Total" pour chaque chantier.

### Changements dans `src/pages/InventaireRecap.tsx`

**1. Passer de 3 à 4 colonnes par chantier** — partout où on calcule `i * 3`, passer à `i * 4` :
- `nbCols` : `2 + chantierIds.length * 4 + 4`
- `totalStartCol` : `3 + chantierIds.length * 4`
- `thickLeftCols` : `3 + i * 4` au lieu de `3 + i * 3`
- Column widths : ajouter la 4e colonne par chantier
- Group header merge : `colStart` à `colStart + 3` (4 colonnes)
- Sub-headers : ajouter "Total" en 4e position avec couleur orange
- Data : colonne `colBase + 3` = good + broken + repair pour ce chantier

**2. Ajustements visuels** :
- Le "Total" par chantier aura le fond orange (comme l'en-tête général)
- Les bordures épaisses restent à la première colonne de chaque groupe

