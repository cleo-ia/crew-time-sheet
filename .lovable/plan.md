

# Correction : les modifications d'absences dans le pre-export ne persistent pas a l'affichage

## Le probleme

Quand vous modifiez "ABS INJ" de 28 a 29 et enregistrez :
1. La valeur est bien sauvegardee en base (dans `fiches.absences_export_override`)
2. Mais apres la sauvegarde, les donnees sont rechargees depuis zero
3. L'affichage recalcule les absences depuis les jours bruts (4 jours x 7h = 28h)
4. La valeur sauvegardee (29) n'est jamais relue pour l'affichage

Le meme probleme existe pour les trajets : les overrides sauvegardes ne sont pas utilises dans `getCellValue`.

## La cause technique

Dans `RHPreExport.tsx`, la fonction `getCellValue` (ligne 402) fait :
```
absenceAbsInj: row.modified.absenceAbsInj ?? absencesByType.ABS_INJ ?? 0
```

Apres le rechargement, `row.modified` est vide (reset a `{}`), et `absencesByType` est recalcule depuis `detailJours` (donnees brutes). L'override sauvegarde en base (`absences_export_override`) existe dans `row.original` mais n'est jamais consulte.

## La solution

Modifier `getCellValue` pour lire les overrides sauvegardes **entre** les modifications locales et les valeurs calculees. L'ordre de priorite devient :

1. Modification locale en cours (`row.modified.absenceAbsInj`) -- edition non encore sauvegardee
2. Override sauvegarde en base (`row.original.absences_export_override?.ABS_INJ`) -- deja enregistre
3. Valeur calculee depuis les jours bruts (`absencesByType.ABS_INJ`) -- valeur par defaut

## Detail technique

**Fichier modifie** : `src/components/rh/RHPreExport.tsx`

Dans `getCellValue`, apres le calcul de `absencesByType` (ligne 365), ajouter la lecture des overrides depuis `row.original` :

```typescript
// Lire les overrides sauvegardes en base (absences_export_override / trajets_export_override)
const savedAbsOverride = (row.original as any).absences_export_override as Record<string, number> | null;
const savedTrajOverride = (row.original as any).trajets_export_override as Record<string, number> | null;
```

Puis modifier chaque ligne d'absence pour intercaler l'override sauvegarde :

```typescript
// Avant (ne persiste pas) :
case "absenceAbsInj": return row.modified.absenceAbsInj ?? absencesByType.ABS_INJ ?? 0;

// Apres (persiste correctement) :
case "absenceAbsInj": return row.modified.absenceAbsInj ?? savedAbsOverride?.ABS_INJ ?? absencesByType.ABS_INJ ?? 0;
```

Meme correction pour toutes les colonnes d'absences (CP, RTT, AM, MP, AT, CONGE_PARENTAL, HI, CPSS, ABS_INJ, ECOLE) et pour les colonnes de trajets (T1-T17, T31, T35, GD, T_PERSO).

Il faut aussi s'assurer que `fetchRHExportData` dans `useRHExport.ts` transmet bien `absences_export_override` dans l'objet retourne (actuellement il le fait via `(emp as any).absences_export_override` mais ne le place pas explicitement dans `RHExportEmployee`). Le champ existe deja grace au spread dans `buildRHConsolidation`, donc il suffit de le lire correctement dans `getCellValue`.

Cela corrigera le probleme : apres sauvegarde et rechargement, la valeur modifiee (29) sera correctement affichee car elle sera lue depuis `absences_export_override` en base.

