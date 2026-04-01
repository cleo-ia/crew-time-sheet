

## Rendre le champ notes visible quand il est vide

### Probleme

Le champ notes affiche `""` quand il n'y a rien, ce qui rend le `div` invisible et donc impossible a cliquer.

### Solution

Quand `t.notes` est vide, afficher un petit texte discret comme une icone crayon ou "+" pour indiquer qu'on peut ajouter une note, sans ecrire "a verifier". Par exemple : une petite icone `Pencil` de 3x3 qui apparait au hover de la ligne, ou un texte minimal `"+ note"` en gris clair.

### Fichier modifie

`src/components/admin/InventoryTemplatesManager.tsx`

### Changement (ligne 385)

Remplacer :
```tsx
{t.notes || ""}
```

Par :
```tsx
{t.notes || <span className="opacity-0 group-hover/row:opacity-50 transition-opacity">+ note</span>}
```

Et ajouter `group/row` sur le `TableRow` parent (ligne ~342) pour que le texte "+ note" n'apparaisse qu'au survol de la ligne.

Alternativement, si on veut quelque chose de toujours visible mais discret, on peut utiliser une petite icone `Pencil` en `opacity-30` :
```tsx
{t.notes || <Pencil className="h-3 w-3 opacity-30" />}
```

### Risque

Aucun — changement cosmétique d'une ligne.

