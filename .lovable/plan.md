

## Plan : Corriger le filtre agence pour toujours afficher toutes les agences

### Problème
Le filtre `agenceInterim` est envoyé dans la requête serveur (ligne 34). Quand une agence est sélectionnée, seuls les employés de cette agence sont retournés → `uniqueAgences` ne contient plus que cette agence.

### Solution
Retirer `agenceInterim` des filtres envoyés à `buildRHConsolidation` et filtrer par agence **côté client** à la place. Ainsi `employees` contient toujours tous les intérimaires de la période, `uniqueAgences` reste complet, et le filtrage visuel se fait localement.

### Fichier modifié
- `src/pages/RapprochementInterim.tsx`
  - Retirer `agenceInterim` de l'objet `filters` (ligne 34)
  - Ajouter un filtre client-side sur `agenceFilter` dans le calcul de `filtered` (après le filtre recherche, ligne 46-50)
  - Conserver `agenceFilter` dans les props passées à `InterimaireExportDialog` pour que l'export PDF reste filtré si besoin

