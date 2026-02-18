

# Solution avec valeur de reference pour les overrides du pre-export

## Le probleme fondamental

On a deux sources de modifications concurrentes :
1. **Tanguy dans le pre-export** : change manuellement ABS_INJ de 28 a 29 -> doit persister
2. **Tanguy dans la vue consolidee** : ajoute une absence INJ -> le calcul passe de 28 a 35 -> doit apparaitre

Ni `Math.max` ni "ignorer les overrides" ne couvre les deux cas correctement.

## La solution : sauvegarder la valeur de reference ("baseline")

Quand Tanguy enregistre un override dans le pre-export, on sauvegarde aussi la valeur calculee a ce moment-la. Au rechargement, on compare :

- Si la valeur calculee actuelle = baseline sauvegardee -> rien n'a change ailleurs -> **afficher l'override**
- Si la valeur calculee actuelle != baseline -> quelque chose a change depuis la vue consolidee -> **afficher la nouvelle valeur calculee** (l'override est obsolete)

```text
Exemple 1 : Tanguy change 28 -> 29 dans le pre-export
  Sauvegarde : override=29, baseline=28
  Rechargement : calcule=28, baseline=28 -> identique -> affiche 29 (OK)

Exemple 2 : Ensuite, ajout absence depuis vue consolidee
  Sauvegarde en base : override=29, baseline=28
  Rechargement : calcule=35, baseline=28 -> different -> affiche 35 (OK)

Exemple 3 : Tanguy diminue 28 -> 20 dans le pre-export
  Sauvegarde : override=20, baseline=28
  Rechargement : calcule=28, baseline=28 -> identique -> affiche 20 (OK)
```

## Detail technique

### 1. Migration SQL : ajouter les colonnes baseline

Ajouter 2 colonnes JSONB a la table `fiches` :

```sql
ALTER TABLE fiches ADD COLUMN absences_baseline jsonb DEFAULT NULL;
ALTER TABLE fiches ADD COLUMN trajets_baseline jsonb DEFAULT NULL;
```

Ces colonnes stockent la valeur calculee au moment ou l'override a ete sauvegarde.

### 2. Fichier : `src/hooks/usePreExportSave.ts`

Modifier l'interface `ModifiedRow` pour accepter les baselines :

```typescript
interface ModifiedRow {
  ficheId: string;
  absencesOverride?: Record<string, number>;
  trajetsOverride?: Record<string, number>;
  absencesBaseline?: Record<string, number>;  // NOUVEAU
  trajetsBaseline?: Record<string, number>;   // NOUVEAU
  // ... reste inchange
}
```

Dans `mutationFn`, sauvegarder les baselines :

```typescript
if (row.absencesOverride) {
  updatePayload.absences_export_override = row.absencesOverride;
  updatePayload.absences_baseline = row.absencesBaseline;
}
if (row.trajetsOverride) {
  updatePayload.trajets_export_override = row.trajetsOverride;
  updatePayload.trajets_baseline = row.trajetsBaseline;
}
```

### 3. Fichier : `src/hooks/useRHExport.ts`

Ajouter `absences_baseline` et `trajets_baseline` au type `RHExportEmployee` et les transmettre dans `fetchRHExportData`.

### 4. Fichier : `src/components/rh/RHPreExport.tsx`

**4a. Dans `getCellValue`**, lire les overrides ET les baselines :

```typescript
const savedAbsOverride = row.original.absences_export_override as Record<string, number> | null;
const savedAbsBaseline = row.original.absences_baseline as Record<string, number> | null;
const savedTrajOverride = row.original.trajets_export_override as Record<string, number> | null;
const savedTrajBaseline = row.original.trajets_baseline as Record<string, number> | null;
```

**4b. Creer une fonction helper** pour la logique de priorite :

```typescript
const resolveOverride = (
  localEdit: number | undefined,
  savedOverride: number | undefined,
  savedBaseline: number | undefined,
  calculated: number
): number => {
  // 1. Modification locale en session -> prioritaire
  if (localEdit !== undefined) return localEdit;
  // 2. Override sauvegarde : valide seulement si les donnees source n'ont pas change
  if (savedOverride !== undefined && savedBaseline !== undefined && savedBaseline === calculated) {
    return savedOverride;
  }
  // 3. Valeur calculee (donnees source)
  return calculated;
};
```

**4c. Appliquer pour chaque champ** (absences et trajets) :

```typescript
case "absenceAbsInj": return resolveOverride(
  row.modified.absenceAbsInj,
  savedAbsOverride?.ABS_INJ,
  savedAbsBaseline?.ABS_INJ,
  absencesByType.ABS_INJ ?? 0
);
```

Meme pattern pour les 10 absences et 21 trajets.

**4d. Dans `handleSaveModifications`**, calculer et transmettre les baselines :

```typescript
// Calculer absences depuis les jours (baseline actuelle)
const absencesBaseline: Record<string, number> = {};
row.original.detailJours?.forEach(jour => {
  if (jour.isAbsent && jour.typeAbsence) {
    absencesBaseline[jour.typeAbsence] = (absencesBaseline[jour.typeAbsence] || 0) + 7;
  }
});

// Calculer trajets baseline
const trajetsBaseline: Record<string, number> = {};
// T1..T17, T31, T35, GD, T_PERSO depuis row.original

return {
  ficheId: row.original.ficheId!,
  absencesOverride: ...,
  trajetsOverride: ...,
  absencesBaseline: Object.keys(absencesOverride).length > 0 ? absencesBaseline : undefined,
  trajetsBaseline: Object.keys(trajetsOverride).length > 0 ? trajetsBaseline : undefined,
  // ...
};
```

## Verification des 4 scenarios

| Scenario | baseline | override | calcul actuel | Resultat |
|----------|----------|----------|---------------|----------|
| Tanguy augmente 28->29 | 28 | 29 | 28 (= baseline) | **29** |
| Tanguy diminue 28->20 | 28 | 20 | 28 (= baseline) | **20** |
| Absence ajoutee ailleurs (28->35) | 28 | 29 | 35 (!= baseline) | **35** |
| Absence retiree ailleurs (28->21) | 28 | 29 | 21 (!= baseline) | **21** |

Tous les cas sont couverts correctement.

## Fichiers modifies

1. **Migration SQL** : ajout colonnes `absences_baseline` et `trajets_baseline` sur `fiches`
2. **`src/hooks/usePreExportSave.ts`** : sauvegarder les baselines avec les overrides
3. **`src/hooks/useRHExport.ts`** : transmettre les baselines dans `RHExportEmployee`
4. **`src/components/rh/RHPreExport.tsx`** : logique `resolveOverride` avec comparaison baseline/calcul

