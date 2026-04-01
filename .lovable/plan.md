

## Simplifier le formulaire inventaire chef : une seule quantité

### Objectif

Remplacer les 3 steppers (Bon, À réparer, Cassé) par un unique stepper de quantité par article.

### Fichier modifié

**`src/components/inventory/InventoryItemRow.tsx`**
- Retirer les 3 `Stepper` (Bon, À réparer, Cassé)
- Afficher un seul stepper "Quantité" au centre
- L'interface `onQuantityChange` enverra la valeur dans `quantity_good` (on garde le même champ DB, les deux autres restent à 0)
- Retirer la logique `showPhotoButton` liée à `quantityRepair > 0 || quantityBroken > 0` — les photos restent optionnelles indépendamment

**`src/components/chantier/tabs/ChantierInventaireTab.tsx`**
- Le `handleQuantityChange` continuera de fonctionner, le chef ne touchera que `quantity_good`
- Les champs `quantity_repair` et `quantity_broken` resteront à 0 par défaut

### Ce qui ne change PAS
- La base de données (les colonnes restent)
- Le hook `useInventoryItems` / `useUpsertInventoryItems`
- La vue côté conducteur (`InventoryReportDetail`) qui affiche le résultat

### Risque

Aucun — simplification UI uniquement.

