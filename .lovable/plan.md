

# Plan : Fusion "Récapitulatif + Ajustements" en une seule étape

## Résumé

Passer de 4 étapes à 3 : **Période > Ajustements & Dashboard > Export & Clôture**. Les widgets de synthèse sont intégrés directement en haut de `RHPreExport.tsx`, calculés en temps réel depuis les `rows` chargées (pas un second appel API). L'alerte trajets reste juste en dessous.

## Modifications

### 1. `src/pages/ExportPaie.tsx`

- Réduire `STEPS` à 3 entrées : `{ id:1, label:"Période" }`, `{ id:2, label:"Ajustements & Dashboard" }`, `{ id:3, label:"Export & Clôture" }`
- Supprimer le bloc `currentStep === 2` (ancien récapitulatif)
- Renommer `currentStep === 3` en `currentStep === 2` (ajustements) et `currentStep === 4` en `currentStep === 3` (export)
- Adapter `canGoNext()` et les boutons de navigation pour 3 étapes au lieu de 4
- Supprimer l'import de `useRHSummary` (plus utilisé ici) et les variables `summary`/`summaryLoading`

### 2. `src/components/rh/RHPreExport.tsx`

- Ajouter un `useMemo` qui calcule les stats live depuis `filteredRows` (ou `rows`) :
  - **Salariés** : `rows.length`
  - **Heures normales** : somme de `heuresNormales` par row (avec modified pris en compte)
  - **Heures supp** : somme `heuresSupp25 + heuresSupp50` par row
  - **Absences** : somme totale des jours d'absence par row
  - **Chantiers** : `new Set(rows.map(r => r.original.chantier))`.size
- Rendre un bandeau compact de 5 widgets (taille réduite : `p-3`, texte `text-xl` au lieu de `text-2xl`) en haut du composant, avant le tableau
- Placer l'alerte "X trajet(s) à compléter" juste en dessous des widgets (calculée depuis les rows ayant des trajets `A_COMPLETER`)
- Ces compteurs se mettent à jour automatiquement puisqu'ils dérivent du state `rows` local, qui est modifié par `handleCellChange`

### Synchronisation des données

Les widgets ne font pas d'appel API séparé. Ils sont un `useMemo` sur `rows`, donc toute modification dans le tableau met immédiatement à jour les compteurs sans rechargement.

