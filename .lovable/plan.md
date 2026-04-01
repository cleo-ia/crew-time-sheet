

## Déplacer l'inventaire du ChantierDetail vers un bouton dans le header chef

### Objectif

Retirer l'onglet "Inventaire" de la page chantier (planning/kanban/todo...) et le rendre accessible via un bouton bien visible dans le header de la page chef (`Index.tsx`), avec une icône rouge pour attirer l'attention.

### Fichiers modifiés

**1. `src/pages/ChantierDetail.tsx`**
- Retirer l'import de `ChantierInventaireTab` et `Package`
- Retirer le `TabsTrigger` "Inventaire" (lignes 106-111)
- Retirer le `TabsContent` "Inventaire" (lignes 134-138)
- Retirer `useFeatureEnabled("inventaireChantier")` si plus utilisé ailleurs

**2. `src/pages/Index.tsx`**
- Importer `Package` (lucide), `ChantierInventaireTab`, et `Dialog`/`Sheet`
- Ajouter un state `showInventaire` 
- Ajouter un bouton dans les `actions` du `PageHeader` (à côté de Congés, Planning tâches, Conversation, Météo) :
  ```
  <Button onClick={() => setShowInventaire(true)}>
    <Package className="h-4 w-4 text-red-500" />
    Inventaire
  </Button>
  ```
  Le bouton aura l'icône `Package` en rouge et sera visible uniquement quand un chantier est sélectionné
- Ajouter un `Sheet` (panneau latéral) ou `Dialog` plein écran qui affiche `<ChantierInventaireTab chantierId={selectedChantier} />` quand `showInventaire` est true

### Comportement

- Le bouton n'apparaît que si `selectedChantier` existe
- Clic → ouvre un Sheet/Dialog contenant le formulaire inventaire pour le chantier sélectionné
- L'icône Package est en rouge (`text-red-500`) pour être bien visible
- Le chef remplit l'inventaire une seule fois, puis le bouton pourra être retiré plus tard

### Risque

Faible — déplacement d'un composant existant d'un endroit à un autre.

