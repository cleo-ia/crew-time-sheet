

# Corriger la persistance Trajet/Panier pour les chefs multi-chantier

## Le probleme

Deux bugs lies dans le cycle sauvegarde/rechargement des cases Trajet :

### Bug 1 : Trajet decoche reapparait sur le chantier principal
- Le chef decoche "Trajet" sur le mardi (0h, chantier principal)
- Il va sur le chantier secondaire, puis revient
- La case Trajet est re-cochee automatiquement
- **Cause** : Au chargement depuis la BDD (ligne 543), la logique est `trajet = true` par defaut si pas de T_PERSO/GD. Elle ne lit jamais la valeur `T` sauvee en BDD.

### Bug 2 : Trajet coche disparait sur le chantier secondaire
- Le chef coche "Trajet" sur le mardi (8h, chantier secondaire)
- Il change de chantier et revient
- La case Trajet n'est plus cochee
- **Cause** : `useZeroDefaults` force `trajet = false` pour le secondaire, meme si la BDD dit `T=1` et `code_trajet` est renseigne.

### Bug 3 (sauvegarde) : Auto-save ecrase la valeur T
- Dans `useAutoSaveFiche.ts` ligne 418 : `T: ... ? 0 : 1` force toujours T=1 si pas GD/T_PERSO
- Le decochage du chef n'est jamais sauvegarde correctement

## Fichiers a modifier

### 1. `src/components/timesheet/TimeEntryTable.tsx` - Chargement (ligne 543)

**Avant** :
```typescript
const trajet = useZeroDefaults ? false : ((isTrajetPerso || isGD) ? false : true);
```

**Apres** :
```typescript
// Lire la valeur T depuis la BDD au lieu de toujours forcer true
const dbTrajet = Number(j.T || 0) > 0;
const trajet = (isTrajetPerso || isGD) ? false : dbTrajet;
```

Cela corrige les deux bugs de chargement :
- Chantier principal : si le chef a decoche (T=0), ca reste decoche
- Chantier secondaire : si le chef a coche (T=1), ca reste coche
- Plus besoin du `useZeroDefaults` pour le trajet ici car la BDD fait foi

### 2. `src/hooks/useAutoSaveFiche.ts` - Sauvegarde (ligne 418)

**Avant** :
```typescript
T: (dayData?.codeTrajet === 'GD' || dayData?.codeTrajet === 'T_PERSO') ? 0 : 1,
```

**Apres** :
```typescript
T: (dayData?.codeTrajet === 'GD' || dayData?.codeTrajet === 'T_PERSO') ? 0 : (dayData?.trajet !== false ? 1 : 0),
```

Note : `dayData?.trajet` n'existe pas dans le type `DayData` du hook. Il faut soit ajouter `trajet?: boolean` a l'interface `DayData`, soit utiliser la logique deja presente via `codeTrajet`.

Approche alternative (plus simple, sans changer l'interface) : si `codeTrajet` est `null` ou vide, ca signifie "pas de trajet" donc T=0. Si c'est renseigne (T1, T2, ..., A_COMPLETER), T=1 :

```typescript
T: (dayData?.codeTrajet === 'GD' || dayData?.codeTrajet === 'T_PERSO') ? 0 
   : (dayData?.codeTrajet ? 1 : 0),
```

Cela aligne la sauvegarde sur la meme logique : "pas de code_trajet = pas de trajet".

### 3. `src/hooks/useAutoSaveFiche.ts` - Default code_trajet (ligne 419)

**Avant** :
```typescript
code_trajet: dayData?.codeTrajet || 'A_COMPLETER',
```

**Apres** :
```typescript
code_trajet: dayData?.codeTrajet ?? null,
```

Si le chef a explicitement decoche trajet (codeTrajet = null), il ne faut pas remettre 'A_COMPLETER'. Le default 'A_COMPLETER' ne doit s'appliquer que lors de l'initialisation (forceNormalize), pas a chaque sauvegarde.

## Resume des impacts

| Scenario | Avant | Apres |
|----------|-------|-------|
| Chef decoche trajet sur principal, change de chantier et revient | Trajet re-coche | Trajet reste decoche |
| Chef coche trajet sur secondaire, change et revient | Trajet decoche | Trajet reste coche |
| Chef decoche trajet, auto-save | T=1 (ecrase) | T=0 (respecte) |
| Employe normal, initialisation | Trajet coche par defaut | Trajet coche par defaut (pas de changement) |

