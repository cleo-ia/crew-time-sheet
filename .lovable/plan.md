
# Plan : Corriger la détection visuelle des absences (Steven PIN)

## Diagnostic

Les données de Steven PIN en base de données montrent :

| Jour | Heures | PA | HI |
|------|--------|-----|-----|
| Lundi | 0 | **true** | 0 |
| Mardi | 0 | **true** | 0 |
| Mercredi | 8 | true | 0 |

Le calcul actuel est :
```typescript
absent: hours === 0 && !PA && HI === 0
```

Comme `PA = true`, la condition `!PA` est `false`, donc `absent = false` même si l'employé a 0 heures.

## Solution

Modifier le calcul pour considérer qu'un employé est **absent** si :
- `heures === 0` **ET** `HI === 0` (pas d'heures travaillées ni intempéries)
- **Indépendamment** de PA (panier repas)

Logique métier : un employé ne peut pas consommer de panier repas s'il n'est pas présent. Les 0h indiquent clairement une absence.

## Fichier modifié

**src/components/validation/FicheDetail.tsx**

### Avant (ligne 308)

```typescript
absent: hours === 0 && !PA && HI === 0,
```

### Après

```typescript
absent: hours === 0 && HI === 0,
```

## Résultat attendu

| Employé | Avant | Après |
|---------|-------|-------|
| Steven PIN - Lundi | Champs actifs, "0h" affiché | **Fond rouge/grisé, checkbox Absent cochée** |
| Steven PIN - Mardi | Champs actifs, "0h" affiché | **Fond rouge/grisé, checkbox Absent cochée** |
| Paul MANUNTA | GD affiché (correct) | Inchangé |

## Impact visuel (TimeEntryTable.tsx existant)

Quand `absent = true`, le composant applique automatiquement :
- Fond rougeâtre : `bg-destructive/5 border-destructive/20`
- Checkbox "Absent" cochée
- Champs de saisie masqués (`{!dayData.absent && ...}`)

## Note

Cette modification n'affecte que l'affichage côté conducteur. Si nécessaire, la même correction peut être appliquée dans `TimeEntryTable.tsx` (chargement des données) pour cohérence dans tous les modes.
