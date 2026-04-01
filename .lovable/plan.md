

## Ajout des 3 états de quantité : Bon état / À réparer / À nettoyer

Le système a déjà les champs `quantity_good`, `quantity_repair`, `quantity_broken` en base de données. Actuellement seul `quantity_good` est utilisé dans l'UI. Il faut renommer/réutiliser ces 3 champs pour afficher : **Bon état**, **À réparer**, **À nettoyer** (on mappe `quantity_broken` → "À nettoyer").

### Fichiers à modifier

**1. `src/components/inventory/InventoryItemRow.tsx`** — Refonte complète du layout
- Afficher le nom du matériel + unité en haut
- En dessous, 3 compteurs côte à côte avec labels colorés :
  - 🟢 **Bon état** (`quantity_good`) — pastille verte
  - 🟠 **À réparer** (`quantity_repair`) — pastille orange  
  - 🔴 **À nettoyer** (`quantity_broken`) — pastille rouge
- Chaque compteur a ses boutons -/input/+ comme actuellement
- Utiliser les props `quantityRepair` et `quantityBroken` déjà déclarées mais non utilisées

**2. `src/components/chantier/tabs/ChantierInventaireTab.tsx`** — Passer les props manquantes
- Ajouter `quantityRepair={item.quantity_repair}` et `quantityBroken={item.quantity_broken}` dans `<InventoryItemRow>`

**3. `src/components/inventory/InventoryReportDetail.tsx`** — Afficher les 3 quantités
- Remplacer l'affichage simple "Qté: X" par 3 badges colorés (Bon: X, Réparer: X, Nettoyer: X)

**4. `src/pages/InventaireRecap.tsx`** — Tableau web + exports
- **Tableau web** : remplacer la colonne unique "Quantité" par 3 colonnes : Bon état / À réparer / À nettoyer (+ colonne Total = somme des 3)
- **MatrixItem** : ajouter `byChantierRepair`, `byChantierBroken`, `totalRepair`, `totalBroken` dans le type et l'agrégation
- **Export Excel** : ajouter les 3 sous-colonnes par chantier (Bon/Réparer/Nettoyer) ou garder simple avec 3 colonnes globales + total
- **Export PDF** : ajouter les colonnes Bon état / À réparer / À nettoyer / Total

### Pas de migration nécessaire
Les colonnes `quantity_good`, `quantity_repair`, `quantity_broken` existent déjà dans la table `inventory_items`.

