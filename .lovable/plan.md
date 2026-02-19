

# Corriger le badge "Absent" dans "Modifier les donnees" pour le chef multi-chantier

## Le probleme

Quand le conducteur clique sur "Modifier les donnees", les jours du chef a 0h (parce qu'il travaille sur l'autre chantier) sont marques "Absent" avec un fond rose. C'est incorrect : il n'est pas absent, il est ailleurs.

La cause est dans la fonction `convertFichesToTimeEntries()` du fichier `FicheDetail.tsx`, ligne 310 :

```
absent: hours === 0 && HI === 0
```

Ce flag est mis a `true` pour tous les jours a 0h, y compris pour le chef multi-chantier.

## La solution

Pour le chef de chantier, ne pas marquer les jours a 0h comme "absent". Il suffit de verifier si l'employe est le chef.

## Fichier a modifier

**`src/components/validation/FicheDetail.tsx`** - ligne 310, dans `convertFichesToTimeEntries()`

### Avant

```typescript
absent: hours === 0 && HI === 0,
```

### Apres

```typescript
absent: (fiche.salarie?.id === ficheData?.chef?.id) ? false : (hours === 0 && HI === 0),
```

### Bonus : corriger aussi le trajet (ligne 313)

Meme bug que celui corrige dans TimeEntryTable : le trajet est force a `true` au lieu de lire la valeur BDD.

```typescript
// Avant
trajet: (isTrajetPerso || isGD) ? false : true,

// Apres
const dbTrajet = Number(jourData?.T || 0) > 0;
trajet: (isTrajetPerso || isGD) ? false : dbTrajet,
```

## Resume

| Scenario | Avant | Apres |
|----------|-------|-------|
| Chef 0h un jour (sur l'autre chantier) | Badge "Absent" + fond rose | Pas de badge, jour normal |
| Employe normal 0h | Badge "Absent" | Pas de changement |
| Trajet decoche par le chef | Re-coche au chargement | Reste decoche |

