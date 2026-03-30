

## Mettre le nombre de trajets dans un badge coloré

### Modification unique — `src/components/rh/RHTransportTab.tsx`

Dans le récapitulatif conducteurs, remplacer l'affichage brut du nombre de trajets (`{count}`) par un `<Badge>` avec une couleur distinctive (variante `secondary` ou custom classe).

```tsx
// Avant
<TableCell className="text-right font-mono">{count}</TableCell>

// Après
<TableCell className="text-right">
  <Badge variant="secondary" className="font-mono">{count}</Badge>
</TableCell>
```

Import `Badge` depuis `@/components/ui/badge`.

