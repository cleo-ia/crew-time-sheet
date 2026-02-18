
# Correction : les overrides d'absences ne sont pas transmis au pre-export

## Le probleme

La correction precedente a ajoute la lecture de `savedAbsOverride` dans `getCellValue`, mais cette valeur est toujours `undefined` car `fetchRHExportData` ne transmet pas `absences_export_override` dans l'objet `RHExportEmployee` retourne.

Le flux actuel :
1. `buildRHConsolidation` recupere correctement `absences_export_override` depuis la base
2. `fetchRHExportData` le lit via `(emp as any).absences_export_override` mais ne le place PAS dans l'objet retourne
3. Dans `RHPreExport`, `(row.original as any).absences_export_override` est donc toujours `undefined`
4. L'affichage retombe sur la valeur calculee (28h)

## La solution

Ajouter `absences_export_override` et `trajets_export_override` dans l'objet retourne par `fetchRHExportData`.

## Detail technique

### Fichier : `src/hooks/useRHExport.ts`

Ajouter 2 champs dans l'interface `RHExportEmployee` :

```typescript
absences_export_override?: Record<string, number> | null;
trajets_export_override?: Record<string, number> | null;
```

Puis dans le mapping (apres la ligne `autresElements`), ajouter :

```typescript
absences_export_override: (emp as any).absences_export_override || null,
trajets_export_override: (emp as any).trajets_export_override || null,
```

Cela permettra a `getCellValue` dans `RHPreExport.tsx` de lire correctement les overrides sauvegardes en base via `(row.original as any).absences_export_override`.

Aucune autre modification necessaire -- le code dans `RHPreExport.tsx` est deja correct, il lui manque juste la donnee.
