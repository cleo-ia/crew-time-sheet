

## Ajouter un bouton X de fermeture au dialog "Appliquer à plusieurs jours"

### Contexte
Le composant `CodeTrajetSelector` (`src/components/timesheet/CodeTrajetSelector.tsx`) utilise un `AlertDialog` pour demander si on applique le trajet à un seul jour ou à tous. Ce composant n'a pas de croix de fermeture contrairement aux `Dialog` classiques.

### Modification

**Fichier** : `src/components/timesheet/CodeTrajetSelector.tsx`

Ajouter un bouton X (icône `X` de lucide-react) en position absolue en haut à droite du `AlertDialogContent`, avec le même style que celui du `DialogContent` (opacity, hover ring orange). Au clic, il ferme le dialog sans appliquer de changement (même comportement que "Ce jour uniquement" — annulation).

### Comportement au clic sur X
- Ferme le dialog
- N'applique aucun changement (ni ce jour, ni tous les jours)
- Reset `pendingValue` à `null`

