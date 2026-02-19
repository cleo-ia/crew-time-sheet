
# Corriger l'absence auto-detectee pour un chef multi-chantier

## Le probleme

Quand le chef Thomas met 0h le mardi sur son chantier principal (car il est sur le secondaire ce jour-la), le systeme recalcule automatiquement "Absent" au rechargement depuis la BDD :

```
absent: hours === 0 && !PA && HI === 0  →  true (fond rose)
```

Le `useZeroDefaults` ne protege que le chantier secondaire, pas le principal.

## La solution

Pour le chef lui-meme, quand il est multi-chantier, ne jamais auto-marquer "Absent" depuis les donnees BDD. Le chef garde la possibilite de cocher "Absent" manuellement si c'est une vraie absence.

## Fichier a modifier

**`src/components/timesheet/TimeEntryTable.tsx`**

### Changement 1 : Identifier si le chef est multi-chantier (pas juste secondaire)

Ajouter un nouveau `useMemo` apres `isChefOnSecondaryChantier` (vers ligne 276) :

```typescript
const isChefMultiChantier = useMemo(() => {
  if (!chefId || !chefChantierPrincipalData?.chantier_principal_id) return false;
  // Le chef est multi-chantier s'il a un chantier principal different du chantier actuel
  // OU s'il est sur le chantier principal mais en a d'autres
  return !!chefChantierPrincipalData.chantier_principal_id;
}, [chefId, chefChantierPrincipalData]);
```

En realite, `isChefOnSecondaryChantier` suffit deja a determiner qu'on est sur le secondaire. Pour le principal, il faut savoir si le chef **a** un secondaire. La logique la plus simple est de reutiliser `isChefOnSecondaryChantier` pour le secondaire et de verifier si le chef est multi-chantier pour le principal.

Approche simplifiee : utiliser directement le fait que le chef a un `chantier_principal_id` et qu'il est affecte a plus d'un chantier.

### Changement 2 : Elargir la condition sur ligne 560

Remplacer :

```typescript
absent: useZeroDefaults ? false : (hours === 0 && !PA && HI === 0),
```

Par :

```typescript
absent: (isChefSelf && isChefOnSecondaryChantier) ? false : 
        (isChefSelf && !isChefOnSecondaryChantier && chefChantierPrincipalData?.chantier_principal_id) ? (hours === 0 && !PA && HI === 0 && (j as any).absent === true) :
        (hours === 0 && !PA && HI === 0),
```

Explication : pour le chef sur le chantier **principal** quand il est multi-chantier, on ne marque absent que si le champ `absent` est explicitement `true` en BDD (= coche manuellement). Pour les non-chefs et le chantier secondaire, pas de changement.

### Version plus lisible

```typescript
// Logique absence pour le chef lui-meme
let computedAbsent: boolean;
if (isChefSelf && useZeroDefaults) {
  // Chantier secondaire : jamais auto-absent
  computedAbsent = false;
} else if (isChefSelf && chefChantierPrincipalData?.chantier_principal_id && chantierId !== chefChantierPrincipalData.chantier_principal_id === false) {
  // Chef sur chantier principal + est multi-chantier : absent seulement si explicitement en BDD
  computedAbsent = (j as any).absent === true;
} else {
  // Cas normal (non-chef ou chef mono-chantier)
  computedAbsent = hours === 0 && !PA && HI === 0;
}
```

### Solution finale simplifiee

La condition cle : **si le chef est multi-chantier** (il a un `chantier_principal_id` different de certains de ses chantiers), alors pour SA propre ligne, on ne deduit JAMAIS `absent` automatiquement des heures. On respecte uniquement le champ `absent` de la BDD (ou `false` par defaut).

Ligne 559-560, remplacer par :

```typescript
// Chef multi-chantier : ne pas auto-marquer absent (il peut etre sur un autre chantier)
// Le chef coche "Absent" manuellement si c'est une vraie absence
absent: isChefSelf && (useZeroDefaults || !!chefChantierPrincipalData?.chantier_principal_id) 
  ? false 
  : (hours === 0 && !PA && HI === 0),
```

Cela couvre les deux cas :
- Chantier secondaire (`useZeroDefaults`) : jamais absent auto → deja OK
- Chantier principal d'un chef multi-chantier : jamais absent auto → NOUVEAU

Le chef peut toujours cocher "Absent" manuellement via la checkbox.

## Resume

| Situation | Avant | Apres |
|-----------|-------|-------|
| Chef 0h sur principal (travaille sur secondaire) | Auto-absent (rose) | Pas absent (neutre) |
| Chef 0h sur secondaire | Pas absent (neutre) | Pas absent (neutre) |
| Chef vraiment absent (coche la case) | Absent | Absent |
| Employe normal 0h | Absent | Absent (pas de changement) |
