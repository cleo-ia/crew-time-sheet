

## Rendre le badge semaine plus visible

**Fichier : `src/pages/RapprochementInterim.tsx`** (ligne ~209)

Changer le style du badge pour ajouter une bordure bleue primaire :

```tsx
// Avant
<Badge variant="outline" className="text-xs">

// Après
<Badge variant="outline" className="text-xs border-primary text-primary">
```

