

## Ajout de matériels par multi-sélection avec suggestions par catégorie

### Objectif

Remplacer le formulaire inline (Input + Select) par une **Dialog avec Combobox multi-sélection** (même pattern que la création de catégories), avec des **suggestions pré-remplies par catégorie**.

### Fichier modifié

`src/components/admin/InventoryTemplatesManager.tsx`

### Changements

**1. Ajouter un dictionnaire de suggestions par catégorie**

```typescript
const DEFAULT_MATERIALS: Record<string, { designation: string; unite: string }[]> = {
  "Consommables": [
    { designation: "Disques à tronçonner (Acier/Inox)", unite: "Boîte" },
    { designation: "Mastic silicone (Cartouche)", unite: "U" },
    { designation: "Vis bois (Boîte)", unite: "Boîte" },
    { designation: "Forets béton SDS", unite: "Lot" },
    { designation: "Ruban de masquage", unite: "Rouleau" },
  ],
  "Electricité & Éclairage": [...],
  // ... les 10 catégories complètes
};
```

Les unités custom (Boîte, Lot, Rouleau) seront ajoutées à `UNIT_OPTIONS`.

**2. Remplacer le bouton "+" par l'ouverture d'une Dialog**

Au clic sur "Ajouter un matériel", ouvrir une Dialog dédiée (pas un formulaire inline) contenant :
- Un `Command` avec recherche
- Les suggestions par défaut pour cette catégorie, fusionnées avec les matériels déjà en base dans d'autres entreprises (ici juste les defaults)
- Les matériels déjà ajoutés dans cette catégorie sont grisés ("déjà ajouté")
- Multi-sélection avec checkboxes (même pattern que les catégories)
- Saisie libre : si le texte tapé ne correspond à aucune suggestion, proposer "Créer « xxx »"
- Chips de sélection en bas
- Bouton "Ajouter (N)"

**3. Nouveau state**

- `showAddMaterialDialog: string | null` — catégorie pour laquelle la dialog est ouverte
- `selectedMaterials: { designation: string; unite: string }[]` — matériels sélectionnés
- `materialSearch: string` — recherche dans la combobox

**4. Handler `handleAddMaterials`**

Boucle sur `selectedMaterials`, crée chaque template avec `createTemplate.mutate()` en série avec des ordres incrémentaux. Ferme la dialog et reset l'état après le dernier.

**5. Garder la saisie libre**

Dans `CommandEmpty`, permettre de taper un nom custom. Quand on l'ajoute, utiliser l'unité "U" par défaut (modifiable ensuite).

### Unités supplémentaires

Ajouter à `UNIT_OPTIONS` : `"Boîte"`, `"Lot"`, `"Rouleau"` pour couvrir les suggestions fournies.

### Comportement attendu

1. Clic "+" sur "EPI & Sécurité"
2. Dialog s'ouvre avec 4 suggestions (Casque, Gants, Lunettes, Bouchons)
3. Je coche Casque + Gants + Lunettes
4. Chips apparaissent en bas
5. Clic "Ajouter (3)"
6. 3 lignes créées dans la card, dialog se ferme
7. Le bouton "+" est toujours disponible pour en ajouter d'autres

### Risque

Faible — même pattern éprouvé que la multi-sélection de catégories. Un seul fichier modifié, hooks inchangés.

