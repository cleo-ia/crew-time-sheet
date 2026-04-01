

## Changements sur l'export Excel du récap inventaire

### Fichier : `src/pages/InventaireRecap.tsx`

**1. Afficher le nom du chantier au lieu du code**

Ligne 68 — modifier `getChantierLabel` pour retourner `c.nom` en priorité :
```ts
return c.nom || c.code_chantier || "—";
```

**2. Bordures verticales épaisses entre les groupes de chantiers**

Lignes 140-141 — ajouter une bordure épaisse :
```ts
const borderThick = { style: "medium" as const, color: { argb: "FF1A1A1A" } };
```

Puis, dans les sections d'en-tête (lignes 213-230) et de données (après ligne 250), appliquer `borderThick` sur le bord gauche de la première colonne de chaque groupe chantier (colonne `3 + i * 3`) et sur le bord gauche de la colonne TOTAUX (`totalStartCol`). Cela concerne :
- La ligne groupe (row 4)
- La ligne sous-en-tête (row 5)
- Chaque ligne de données
- Les lignes séparateurs de catégorie

Concrètement, pour chaque cellule à la position `colStart = 3 + i * 3` (et `totalStartCol`), on remplace `border.left` par `borderThick`.

