

## Refonte UX de InventoryTemplatesManager — Approche "Top-Down" par catégories

### Objectif

Remplacer le formulaire global unique par une interface structurée en blocs/cartes par catégorie, avec ajout d'articles localisé dans chaque carte.

### Fichier modifie

`src/components/admin/InventoryTemplatesManager.tsx` (remplacement complet)

### Nouvelle structure UI

```text
┌─────────────────────────────────────────────┐
│  Catalogue de matériel                      │
│  [+ Créer une nouvelle catégorie]           │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ Card "EPI" ──────── [✏️] [🗑️] [↑] [↓]─┐
│  │  Casques ............ U    [↑][↓][🗑️]  │
│  │  Gants .............. Paire [↑][↓][🗑️] │
│  │  ─────────────────────────────────────── │
│  │  [Désignation] [Unité ▾]  [+ Ajouter]   │
│  └──────────────────────────────────────────┘
│                                             │
│  ┌─ Card "Électroportatif" ── [✏️][🗑️]───┐
│  │  Perceuse 18V ....... U   [↑][↓][🗑️]  │
│  │  ─────────────────────────────────────── │
│  │  [Désignation] [Unité ▾]  [+ Ajouter]   │
│  └──────────────────────────────────────────┘
└─────────────────────────────────────────────┘
```

### Changements concrets

1. **Bouton principal "Créer une catégorie"** en haut
   - Ouvre un AlertDialog avec un champ texte pour le nom de la catégorie
   - A la validation, crée un premier template "placeholder" ou simplement enregistre la catégorie en créant un article vide (on demandera la designation juste après)
   - Alternative plus propre : crée la catégorie en ajoutant directement le premier article via un formulaire inline qui apparait

2. **Header de chaque carte catégorie** avec :
   - Nom de la catégorie (texte gras)
   - Icone crayon (Pencil) : ouvre un dialog pour renommer — fait un `updateTemplate` sur tous les templates de cette catégorie
   - Icone poubelle (Trash2) : AlertDialog de confirmation ("Supprimer la catégorie X et ses N articles ?"), puis `deleteTemplate` sur chaque article
   - Fleches haut/bas pour réordonner les catégories entre elles (optionnel, via un champ `ordre` sur les catégories — on peut simuler en triant alphabétiquement ou en prefixant)

3. **Formulaire d'ajout inline dans chaque carte**
   - Champ "Désignation" (Input, placeholder "Ex: Perceuse 18V")
   - Champ "Unité" : `Select` dropdown avec options fixes : `U`, `Paire`, `Ens`, `m`, `m²`, `Kg`, `L`
   - Bouton "+ Ajouter à {catégorie}"
   - La catégorie est héritée automatiquement du bloc parent

4. **Lignes articles existants** (inchangé globalement)
   - Désignation, Unité, fleches haut/bas, poubelle
   - Conserve la logique `handleMove` existante

5. **Suppression du formulaire global** en haut (Card avec les 3 champs + datalist)

### Etat local a ajouter

- `newCategoryName: string` + `showNewCategoryDialog: boolean` pour la creation de categorie
- `renamingCategory: string | null` + `renameValue: string` pour le renommage
- `addDesignation: Record<string, string>` et `addUnite: Record<string, string>` : un etat par categorie pour les formulaires inline

### Gestion du renommage de categorie

Quand on renomme une categorie, on fait un batch `updateTemplate({ id, categorie: newName })` sur tous les templates de l'ancienne categorie. Le hook `useUpdateInventoryTemplate` existe deja.

### Gestion de la suppression de categorie

AlertDialog de confirmation, puis boucle sur `deleteTemplate.mutate(id)` pour chaque article de la categorie.

### Composants UI utilises

- `AlertDialog` (confirmation suppression categorie)
- `Dialog` (creation/renommage categorie)
- `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` (unite dropdown)
- `Card, Table, TableBody, TableRow, TableCell` (existants)
- `Button, Input` (existants)
- Icons : `Plus, Trash2, ArrowUp, ArrowDown, Pencil` de lucide-react

### Risque de regression

Aucun — seul `InventoryTemplatesManager.tsx` est modifie. Les hooks restent identiques. Le composant est utilise dans `AdminPanel` et `InventaireParametrage`, les deux continueront de fonctionner.

