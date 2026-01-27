
# Extension du filtre à 6 semaines pour les validations conducteur

## Modification

| Fichier | Ligne | Changement |
|---------|-------|------------|
| `src/components/validation/WeekSelectorWithPending.tsx` | 46 | `for (let i = -1; i <= 1; i++)` → `for (let i = -4; i <= 1; i++)` |

## Résultat

```
AVANT:  S04 → S05 → S06
        [3 semaines]

APRÈS:  S01 → S02 → S03 → S04 → S05 → S06
        [6 semaines : 4 passées + actuelle + 1 future]
```

## Fonctionnalités conservées

- L'option "Toutes les semaines" reste disponible
- Le point orange continue d'indiquer les semaines avec fiches en attente
- Le tri reste décroissant (plus récente en premier)
