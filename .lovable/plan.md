

## Multi-selection de categories dans la modale de creation

### Objectif

Permettre de cocher plusieurs categories dans la modale "Nouvelle categorie" et de toutes les creer d'un coup au clic sur "Creer".

### Fichier modifie

`src/components/admin/InventoryTemplatesManager.tsx`

### Changements

1. **Remplacer `newCategoryName: string` par `selectedCategories: string[]`** — un tableau pour stocker les selections multiples.

2. **Modifier les `CommandItem`** — au clic, toggle la categorie dans le tableau `selectedCategories` (ajouter si absente, retirer si presente). Afficher une checkbox (icone `Check`) a gauche de chaque item selectionne.

3. **Permettre aussi la saisie libre en multi** — le bouton "Creer « xxx »" dans `CommandEmpty` ajoute la categorie custom au tableau `selectedCategories` au lieu de remplacer la selection.

4. **Afficher un resume des selections** — remplacer le `<p>` "Selection : X" par une liste de badges/chips montrant toutes les categories selectionnees, avec possibilite de retirer individuellement (petite croix sur chaque chip).

5. **Modifier `handleCreateCategory`** — boucler sur `selectedCategories` pour creer chaque categorie virtuelle d'un coup, puis vider le tableau et fermer la modale.

6. **Bouton "Creer"** — desactive si `selectedCategories.length === 0`. Le label peut indiquer le nombre : "Creer (3)".

### Comportement attendu

- Ouvrir la modale → voir la liste de suggestions
- Cliquer sur "EPI & Securite" → checkbox apparait, item selectionne
- Cliquer sur "Petit Outillage" → 2 items selectionnes
- Taper "Mon truc custom" → cliquer "Creer « Mon truc custom »" → 3 items selectionnes
- Cliquer "Creer (3)" → 3 cards apparaissent, modale se ferme

### Risque

Aucun — modification limitee a la logique de la modale dans un seul fichier. Les hooks restent inchanges.

