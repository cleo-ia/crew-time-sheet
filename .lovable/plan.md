

## Plan : Corriger `chantiersChefMap` → `plannedChefByChantier` (ligne 744)

### Fichier : `supabase/functions/sync-planning-to-teams/index.ts`

**1 seule modification, ligne 744 :**

```
Avant :  const plannedChefForProtected = chantiersChefMap.get(chantierId)
Après :  const plannedChefForProtected = plannedChefByChantier.get(chantierId)
```

La variable `plannedChefByChantier` est definie a la ligne 427 et contient exactement les memes donnees attendues (le chef responsable par chantier). Correction defensive pure, aucun changement de logique.

