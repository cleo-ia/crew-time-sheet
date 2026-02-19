

# Ne pas marquer le chef multi-chantier comme "Absent" sur son chantier secondaire

## Le probleme

Quand le chef est sur son chantier secondaire, ses jours sont initialises a 0h (correct), mais le calcul `absent: (hours === 0 && !PA && HI === 0)` les marque comme "Absent" (incorrect). Le chef n'est pas absent : il est sur son chantier principal ce jour-la. Ca donne un fond rouge + badge "Absent" trompeur.

## La solution

Dans `TimeEntryTable.tsx`, modifier le calcul du champ `absent` pour le chef sur son chantier secondaire : forcer `absent = false` quand c'est le chef lui-meme et qu'on est sur un chantier secondaire.

## Fichier a modifier

**`src/components/timesheet/TimeEntryTable.tsx`** - 2 endroits :

### 1. Initialisation par defaut (lignes 513-519)

Les jours par defaut du chef secondaire sont deja initialises avec `absent: false` -- OK, pas de changement ici.

### 2. Chargement depuis la BDD (ligne 560)

Actuellement :
```typescript
absent: (hours === 0 && !PA && HI === 0),
```

Modifier en :
```typescript
absent: useZeroDefaults ? false : (hours === 0 && !PA && HI === 0),
```

Quand `useZeroDefaults` est vrai (= c'est le chef sur son chantier secondaire), on force `absent = false` meme si les heures sont a 0. Le chef peut toujours cocher "Absent" manuellement s'il le souhaite, mais ce ne sera plus le cas par defaut.

## Impact sur les autres vues

- **Conducteur / RH / Signature** : ces vues utilisent leur propre logique d'absence basee sur les donnees en BDD (`heures = 0 AND HI = 0`). Si le chef ne saisit rien sur le secondaire, la fiche sera transmise avec 0h sans marquage d'absence, ce qui est le comportement souhaite.
- **Pas d'impact sur les employes normaux** : la condition `useZeroDefaults` ne s'applique qu'au chef lui-meme sur un chantier secondaire.

## Verification

Apres modification, sur le chantier secondaire du chef :
- Jours affiches avec fond neutre (pas rouge)
- Pas de badge "Absent"
- 0h / 0 panier / 0 trajet par defaut
- Le chef peut saisir des heures s'il le souhaite
- Le chef peut cocher "Absent" manuellement si besoin
