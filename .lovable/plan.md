

## Plan : Améliorer le tableau Intérimaires

### Modifications sur `src/components/admin/InterimairesManager.tsx`

**1. Rapprocher Nom et Prénom visuellement**
- Réduire le padding des colonnes Nom et Prénom (classes `pr-1` / `pl-1`) pour qu'elles soient visuellement plus proches.

**2. Ajouter la colonne "Rôle" entre Prénom et Agence**
- Nouveau `<TableHead>Rôle</TableHead>` après Prénom
- Nouveau `<TableCell>` affichant un badge avec la couleur turquoise du screenshot (`hsl(180 70% 50%)` — la couleur déjà utilisée pour "Intérimaire" dans `RoleBadge`)
- Importer `RoleBadge` depuis `@/components/ui/role-badge` et afficher `<RoleBadge role="interimaire" size="sm" />`
- Ajuster les `colSpan` des lignes loading/vides (+1)

**3. Ajouter un filtre de recherche**
- Ajouter un state `searchTerm`
- Ajouter un `<Input>` avec icône `Search` au-dessus du tableau (à côté du compteur et du bouton)
- Filtrer `interimaires` par nom, prénom ou agence (recherche insensible à la casse)

