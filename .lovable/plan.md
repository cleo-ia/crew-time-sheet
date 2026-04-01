

## Auto-sélection du champ quantité au focus

### Problème

Quand le chef tape sur le champ "0", le curseur se place après le 0 — il doit d'abord effacer manuellement avant de saisir sa valeur.

### Solution

Ajouter `onFocus={(e) => e.target.select()}` sur l'input quantité dans `src/components/inventory/InventoryItemRow.tsx`. Cela sélectionne automatiquement le contenu au tap, donc la saisie remplace directement le "0".

### Fichier modifié

**`src/components/inventory/InventoryItemRow.tsx`** — ajouter `onFocus` sur l'input number existant.

