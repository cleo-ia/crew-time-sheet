

## Plan : Retirer la colonne "Affectation" de l'onglet Intérimaires

### Approche
Ajouter une prop optionnelle `showAffectation` (default `true`) au composant `InterimairesManager` pour masquer la colonne Affectation sans casser la vue admin existante.

### Modifications

**`src/components/admin/InterimairesManager.tsx`**
- Ajouter une prop `showAffectation?: boolean` (défaut `true`)
- Conditionner l'affichage du `<TableHead>` et `<TableCell>` "Affectation" sur cette prop
- Ajuster le `colSpan` des lignes vides/loading (5 → 4 quand masqué)

**`src/pages/RapprochementInterim.tsx`**
- Passer `<InterimairesManager showAffectation={false} />`

