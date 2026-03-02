

## Ajout du flag `exclure_export_paie` pour Fabrice FROMENT

### Contexte
Fabrice FROMENT (id: `2df97afd-e91b-4681-ac27-4a000f33a1c7`) est chef chez 2CB mais enregistré dans Limoge Revillon pour gérer les ouvriers LR au dépôt. Il ne doit pas apparaitre dans l'export paie BDO de Limoge Revillon.

### Modifications

**1. Migration SQL** -- Ajouter la colonne + flag sur Fabrice
- `ALTER TABLE utilisateurs ADD COLUMN exclure_export_paie boolean NOT NULL DEFAULT false;`
- `UPDATE utilisateurs SET exclure_export_paie = true WHERE id = '2df97afd-e91b-4681-ac27-4a000f33a1c7';`

**2. `src/hooks/rhShared.ts`** -- Filtrer en fin de consolidation
- Après la construction de `employeeMap`, avant le tri final (ligne ~768), filtrer les salariés ayant `exclure_export_paie = true`.
- Le champ sera récupéré depuis la requête `utilisateurs` déjà présente dans la fonction.

**3. `src/hooks/useRHExport.ts`** -- Aucun changement nécessaire
- L'export appelle `buildRHConsolidation` qui fera déjà le filtrage. L'exclusion se propage automatiquement.

**4. `src/components/admin/ChefsManager.tsx`** -- Afficher un badge "Exclu paie"
- Ajout d'un petit badge visuel à côté du nom de Fabrice pour indiquer qu'il est exclu de l'export.

**5. Interface `Utilisateur`** (`src/hooks/useUtilisateurs.ts`) -- Ajouter le champ typé
- Ajouter `exclure_export_paie?: boolean` à l'interface `Utilisateur`.

### Ce qui ne change pas
- Planning : Fabrice reste visible et assignable normalement
- Fiches : les ouvriers LR sur 2CB-Atelier continuent d'apparaitre dans l'export LR
- Seul Fabrice lui-même est exclu de l'export paie

