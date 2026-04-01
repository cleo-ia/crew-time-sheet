

## Ajouter la consultation plein écran des photos inventaire (côté conducteur)

### Constat

Les miniatures photos sont déjà affichées dans `InventoryReportDetail.tsx` (lignes 55-61), mais elles font 64x64px et ne sont pas cliquables. Le conducteur ne peut pas les agrandir.

### Solution

Ajouter un état local pour stocker l'URL de la photo sélectionnée, et afficher un Dialog/overlay plein écran quand on clique sur une miniature.

### Changement (1 fichier)

**`src/components/inventory/InventoryReportDetail.tsx`**

1. Ajouter `useState<string | null>(null)` pour `selectedPhoto`
2. Rendre chaque `<img>` cliquable (`onClick` + `cursor-pointer`)
3. Ajouter un `<Dialog>` secondaire qui affiche la photo en grand (`max-w-[90vw] max-h-[80vh] object-contain`) avec un bouton fermer

### Résultat

Le conducteur clique sur une miniature → la photo s'ouvre en grand dans un overlay. Il ferme et revient à la liste.

