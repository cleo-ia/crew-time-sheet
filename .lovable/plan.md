

## Plan : Retirer le type d'absence "École (ECO)" du dropdown

Le type "ECOLE" dans le dropdown d'absence n'a plus d'utilité car la gestion école passe désormais par le flag `is_ecole` sur le chantier. Cependant, le type reste dans le code de consolidation et d'export Excel pour continuer à afficher correctement les données historiques — on ne touche qu'au sélecteur.

### Modification

**`src/components/rh/EditableAbsenceTypeCell.tsx`** (ligne 34) :
- Supprimer l'entrée `{ value: "ECOLE", label: "École (ECO)" }` du tableau `ABSENCE_TYPES`.

Aucun autre fichier modifié. Les références à ECOLE dans `excelExport.ts`, `rhShared.ts`, `RHPreExport.tsx` etc. restent intactes pour la rétrocompatibilité des données existantes.

