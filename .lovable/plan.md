

## Modifications de l'export Excel

### Fichier : `src/pages/InventaireRecap.tsx`

**1. Supprimer la ligne "TOTAL GÉNÉRAL"** (lignes 305-344) — cette ligne additionne des matériels différents et n'a pas de sens.

**2. Ajouter une colonne "Total" à droite des colonnes TOTAUX** — elle affichera `totalGood + totalRepair + totalBroken` pour chaque article (la somme des 3 colonnes Bon/Nett/Rép de TOTAUX).

Changements concrets :
- `nbCols` passe de `2 + chantierIds.length * 3 + 3` à `2 + chantierIds.length * 3 + 4` (ajout d'une colonne).
- Ajouter largeur pour la nouvelle colonne (`totalStartCol + 3`, width 12).
- En-tête groupe (row 4) : le merge TOTAUX passe de 3 à 4 colonnes, ou bien la 4e colonne a son propre en-tête.
- En-tête sous (row 5) : ajouter "Total" dans la colonne `totalStartCol + 3`.
- Données : ajouter `item.total` (ou `item.totalGood + item.totalBroken + item.totalRepair`) dans la nouvelle colonne.
- Supprimer le bloc lignes 305-344 (total général en bas).
- Ajouter le thick border sur la nouvelle colonne total.

