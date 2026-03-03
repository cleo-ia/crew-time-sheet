

## Correction du lasso — suppression du double-comptage scroll

### Problème identifié
`getBoundingClientRect()` retourne la position visuelle qui intègre déjà le scroll. Ajouter `container.scrollLeft`/`scrollTop` par-dessus double-compte le décalage, plaçant le rectangle lasso hors écran.

### Modifications — `src/components/chantier/planning/TaskBars.tsx`

**1. `handleContainerMouseDown` (lignes 329-330)**
Supprimer `+ container.scrollLeft` et `+ container.scrollTop` :
```ts
const x = e.clientX - containerRect.left;
const y = e.clientY - containerRect.top;
```

**2. `handleMouseMove` — section lasso (lignes 163-164)**
Même correction :
```ts
const currentX = e.clientX - containerRect.left;
const currentY = e.clientY - containerRect.top;
```

### Rien d'autre à changer
2 lignes modifiées dans chaque fonction, même fichier.

