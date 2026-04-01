

## Simplifier l'affichage inventaire côté conducteur

### Problème

Le `InventoryReportDetail` (vue conducteur) affiche encore "Bon: X / À réparer: X / Cassé: X" alors que le chef ne saisit plus qu'une seule quantité. Résultat : le conducteur voit "Bon: 14, À réparer: 0, Cassé: 0" — inutile et confus.

### Solution

Dans `src/components/inventory/InventoryReportDetail.tsx`, remplacer les 3 lignes colorées par un simple affichage de la quantité totale, aligné avec ce que le chef saisit.

### Changement (1 fichier)

**`src/components/inventory/InventoryReportDetail.tsx`** — lignes 55-59

Remplacer :
```
Bon: X | À réparer: X | Cassé: X
```

Par :
```
Quantité: {item.quantity_good}
```

Afficher aussi l'unité si disponible. Conserver l'affichage des photos en dessous.

### Résultat visuel

```text
Avant :
  botte                        Total: 14
  Bon: 14   À réparer: 0   Cassé: 0

Après :
  botte (U)                    Qté: 14
```

### Risque
Aucun — changement purement cosmétique.

