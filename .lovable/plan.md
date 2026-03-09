

# Plan : Séparer les estimations paie prévisionnelle de la consolidation RH

## Problème

`buildRHConsolidation()` génère **systématiquement** les jours estimés (paie prévisionnelle) pour compléter la fin de mois. Toutes les pages qui l'appellent (Consolidation RH, Export Paie, Rapprochement Intérim, Clôture) reçoivent donc les mêmes données gonflées avec les jours virtuels.

Résultat : la page **Consolidation RH** affiche des totaux incluant des jours qui n'existent pas encore.

## Solution

Ajouter un flag `includeEstimations?: boolean` dans `RHFilters`. Par défaut `false` (pas d'estimations). Seuls les appelants qui en ont besoin (export paie, clôture) le passent à `true`.

## Fichier modifié

**`src/hooks/rhShared.ts`**

1. Ajouter `includeEstimations?: boolean` dans l'interface `RHFilters` (ligne 16)
2. Conditionner le bloc paie prévisionnelle (lignes 714-755) avec `if (filters.includeEstimations && !isAllPeriodes && mois)`

## Appelants à mettre à jour (passer `includeEstimations: true`)

| Fichier | Contexte |
|---|---|
| `src/hooks/useRHExport.ts` (ligne 109) | `fetchRHExportData` — export Excel |
| `src/components/rh/ClotureDialog.tsx` (lignes 63 + 133) | Preview + clôture |
| `src/components/rh/RHPeriodeDetail.tsx` (ligne 44) | Détail période clôturée |

## Appelants qui restent SANS estimations (aucun changement)

- `useRHSummary` (useRHData.ts ligne 77) — stats consolidation
- `useRHConsolidated` (useRHData.ts ligne 126) — tableau consolidé
- `RapprochementInterim.tsx` (ligne 69) — rapprochement agences

## Impact

- La consolidation RH affichera uniquement les heures/paniers/trajets réellement transmis
- L'export paie et la clôture continueront d'inclure les estimations
- Aucune modification de base de données nécessaire

