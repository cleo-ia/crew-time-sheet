

# Correction : reporter le delta des overrides au lieu de les ignorer

## Le probleme

La logique actuelle dans `resolveOverride` est binaire :
- baseline = calcule -> garder l'override
- baseline != calcule -> ignorer l'override et afficher le calcule

Mais quand Tanguy ajoute +1h manuellement (28 -> 29), puis qu'une absence est ajoutee (calcule passe a 35), on veut **35 + 1 = 36**, pas 35.

## La solution : appliquer le delta

Modifier `resolveOverride` pour calculer et reporter l'ecart :

```typescript
const resolveOverride = (
  localEdit: number | undefined,
  savedOverride: number | undefined,
  savedBaseline: number | undefined,
  calculated: number
): number => {
  // 1. Modification locale en session -> prioritaire
  if (localEdit !== undefined) return localEdit;
  // 2. Override sauvegarde avec baseline
  if (savedOverride !== undefined && savedBaseline !== undefined) {
    if (savedBaseline === calculated) {
      // Donnees source inchangees -> garder l'override tel quel
      return savedOverride;
    } else {
      // Donnees source modifiees -> reporter le delta
      const delta = savedOverride - savedBaseline;
      if (delta === 0) return calculated; // pas de modif manuelle reelle
      return calculated + delta;
    }
  }
  // 3. Valeur calculee (pas d'override)
  return calculated;
};
```

## Verification des scenarios

| Scenario | baseline | override | calcul actuel | delta | Resultat |
|----------|----------|----------|---------------|-------|----------|
| Tanguy +1h, pas de changement | 28 | 29 | 28 | +1 | **29** |
| Tanguy +1h, absence ajoutee | 28 | 29 | 35 | +1 | **36** |
| Tanguy -8h, pas de changement | 28 | 20 | 28 | -8 | **20** |
| Tanguy -8h, absence ajoutee | 28 | 20 | 35 | -8 | **27** |
| Tanguy pas de modif, absence ajoutee | 28 | 28 | 35 | 0 | **35** |

Tous les cas sont couverts : le delta manuel est toujours preserve.

## Fichier a modifier

**`src/components/rh/RHPreExport.tsx`** : modifier uniquement la fonction `resolveOverride` (environ 10 lignes). Aucun autre fichier ne change.

