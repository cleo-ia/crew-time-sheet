

## Améliorer le style des lignes "Sous-total" du tableau Rapprochement Intérimaire

**Fichier : `src/pages/RapprochementInterim.tsx` — ligne 411**

Modifier le `className` de la `TableRow` sous-total et de ses cellules :

**Ligne sous-total (TableRow)** :
- Renforcer le fond : `bg-muted/40` → `bg-muted/60`
- Ajouter une bordure haute : `border-t-2`
- Ajouter une bordure gauche bleue épaisse : `border-l-4 border-l-primary/50`
- Garder la bordure basse existante

**Texte des valeurs (TableCell)** :
- Passer de `font-bold` à `font-semibold` sur les cellules de valeurs (déjà bold, on garde)
- Le label "Sous-total ADEQUAT" : garder `font-bold` + passer de `text-muted-foreground` à `text-foreground/80` pour un meilleur contraste

Résultat CSS de la ligne :
```tsx
<TableRow className="bg-muted/60 border-t-2 border-b-2 border-border/50 border-l-4 border-l-primary/50">
  <TableCell className="font-bold text-sm pl-8 text-foreground/80">
```

Changement minimal (2 lignes), sobre, et la bordure bleue à gauche donne un repère visuel clair sans se confondre avec les bandeaux d'agence.

