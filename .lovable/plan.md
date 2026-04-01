

## Rendre le bouton Photo plus discret dans InventoryItemRow

### Changement

Dans `src/components/inventory/InventoryItemRow.tsx` : remplacer le bouton "Photo" pleine largeur par une petite icône caméra discrète, alignée à droite ou à côté du stepper, sans texte "Photo" ni largeur `w-full`.

### Détail technique

- Remplacer `<Button variant="outline" size="sm" className="w-full">` par un petit bouton icône (`size="icon"`, `variant="ghost"`) avec juste l'icône Camera
- Placer ce bouton sur la même ligne que le nom du matériel et le stepper, à droite
- Les photos uploadées restent affichées en miniatures en dessous

### Résultat visuel

```text
Avant :
  Masque respiratoire (FFP3)  (Boîte)    — 0 +
  [        📷 Photo (pleine largeur)        ]

Après :
  Masque respiratoire (FFP3)  (Boîte)    📷  — 0 +
```

### Risque
Aucun — changement purement visuel.

