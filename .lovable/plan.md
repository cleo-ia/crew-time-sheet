

## Combobox intelligente pour la creation de categorie

### Objectif

Remplacer le champ `Input` dans la modale "Nouvelle categorie" par une Combobox (Popover + Command) permettant :
- Suggestions par defaut (10 categories BTP standards)
- Fusion dynamique avec les categories existantes en base
- Saisie libre pour creer des categories personnalisees

### Fichier modifie

`src/components/admin/InventoryTemplatesManager.tsx`

### Changements

1. **Liste de suggestions par defaut** (constante) :
   - EPI & Securite, Electroportatif, Petit Outillage, Consommables, Signalisation & Balisage, Engins & Gros Materiel, Gros OEuvre, Electricite & Eclairage, Manutention & Levage, Vetements de travail

2. **Fusion dynamique** : combiner cette liste avec `categories` (extraites des templates existants), dedoublonner, trier alphabetiquement. Les categories deja creees sont marquees comme "existantes" et non selectionnables (ou grisees).

3. **Remplacement du Dialog** (lignes 239-256) :
   - Remplacer le `<Input>` par un `Popover` + `Command` (composants deja presents dans le projet via `cmdk`)
   - `CommandInput` pour la saisie libre avec filtrage
   - `CommandGroup` listant les suggestions fusionnees
   - `CommandEmpty` affichant "Creer « {saisie} »" quand aucun match — permet la saisie libre
   - Quand l'utilisateur selectionne une suggestion ou valide sa saisie libre, on appelle `handleCreateCategory` avec cette valeur

4. **Filtrage intelligent** : les categories deja presentes dans `allCategories` (existantes + virtuelles) sont filtrees ou affichees en grise avec un label "(deja creee)" pour eviter les doublons.

### Imports a ajouter

- `Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem` depuis `@/components/ui/command`
- `Popover, PopoverContent, PopoverTrigger` depuis `@/components/ui/popover` (optionnel — on peut rester dans le Dialog existant et juste y mettre le Command)

### Approche retenue

Garder le `Dialog` existant mais remplacer l'`Input` interne par le composant `Command` (sans Popover, directement dans le Dialog). Plus simple et coherent avec le pattern existant.

### Risque de regression

Aucun — modification limitee a la modale de creation dans un seul fichier. Memes hooks, meme logique de creation.

