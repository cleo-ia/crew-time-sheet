

# Exclure les intérimaires de la page Export Paie

## Approche

La solution la plus simple et sans risque : ajouter `typeSalarie: "non_interimaire"` dans les filtres de la page, et ajouter le support de cette valeur dans `buildRHConsolidation` (fichier `rhShared.ts`).

## Modifications

### 1. `src/hooks/rhShared.ts` (ligne ~531-536)
Ajouter un cas `non_interimaire` dans le bloc de filtre `typeSalarie` :
```ts
if (filters.typeSalarie === "non_interimaire" && isInterimaire) continue;
```

### 2. `src/pages/ExportPaie.tsx` (ligne 42-49)
Changer `typeSalarie: "all"` en `typeSalarie: "non_interimaire"` dans l'objet `filters`. Cela exclura automatiquement les intérimaires du récap (étape 2), des ajustements pré-export (étape 3), et de l'export Excel (étape 4).

### 3. Optionnel : ajouter une note visuelle
Ajouter un petit bandeau info sur l'étape 2 rappelant que les intérimaires sont exclus et traités via le module dédié (Rapprochement Intérim / Export Intérimaires).

## Impact
- Le filtre `non_interimaire` est une nouvelle valeur qui n'affecte aucun autre écran.
- L'export intérimaires (bouton étape 4) reste disponible car il passe son propre filtre `typeSalarie: "interimaire"`.

