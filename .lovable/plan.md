

## Corrections sur le récap inventaires (web + Excel)

### Problèmes identifiés
1. **Ordre incorrect** : le tableau web et l'Excel affichent "Bon état → À réparer → À nettoyer", alors que le formulaire montre "Bon état → À nettoyer → À réparer"
2. **Fond orange pastel** indésirable sur la colonne "À nettoyer" (web + Excel)
3. **Pastilles de couleur** à corriger : orange pour "À nettoyer", rouge pour "À réparer" (conformément au formulaire)

### Modifications dans `src/pages/InventaireRecap.tsx`

**Tableau web (lignes 551-584)** :
- Inverser les colonnes : Bon état → À nettoyer (pastille orange) → À réparer (pastille rouge)
- Supprimer le `style={{ backgroundColor: "#c2410c" }}` du header "À nettoyer"
- Supprimer le `style={{ backgroundColor: "rgba(251, 191, 36, 0.08)" }}` des cellules "À nettoyer"
- Ajuster les couleurs de texte : orange pour "À nettoyer", rouge pour "À réparer"

**Export Excel (lignes 211-284)** :
- Inverser l'ordre des sub-headers : `["Bon", "Nett.", "Rép."]` avec couleurs `[vert, orange, rouge]`
- Inverser les données par chantier : écrire broken avant repair
- Inverser les totaux
- Supprimer le fond pastel orange (lignes 279-284) : utiliser `bgColor` uniforme pour toutes les colonnes

**Export PDF (lignes 410-500)** :
- Inverser l'ordre des colonnes : Bon état → À nettoyer → À réparer
- Inverser les couleurs de texte correspondantes

