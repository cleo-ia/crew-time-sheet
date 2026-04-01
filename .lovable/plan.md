

## Inverser les boutons Congés et Inventaire dans le header chef

### Changement

Dans `src/pages/Index.tsx`, lignes 466-479 : placer le bouton Inventaire **avant** le bouton Congés.

```
Avant : CongesButton → Inventaire → PlanningTâches → ...
Après : Inventaire → CongesButton → PlanningTâches → ...
```

### Détail technique

Déplacer le bloc `{selectedChantier && (<Button ... Inventaire ...>)}` (lignes 469-479) avant `<CongesButton .../>` (ligne 468).

