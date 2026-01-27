
# Mode lecture seule pour les onglets Todo et Récap

## Problème identifié

Le mode `isReadOnly` est bien calculé dans `ChantierDetail.tsx` mais il n'est passé qu'à l'onglet **Planning**. Les onglets **Todo** et **Récap** ne reçoivent pas ce flag et restent donc entièrement éditables.

## Composants à modifier

### 1. `src/pages/ChantierDetail.tsx`

Passer la prop `readOnly` aux composants Todo et Kanban :

```typescript
<TabsContent value="recap">
  <ChantierKanbanTab chantierId={chantier.id} readOnly={isReadOnly} />
</TabsContent>
<TabsContent value="todo">
  <ChantierTodoTab chantierId={chantier.id} readOnly={isReadOnly} />
</TabsContent>
```

---

### 2. `src/components/chantier/tabs/ChantierTodoTab.tsx`

**Modifications :**
- Ajouter prop `readOnly?: boolean`
- Masquer le bouton "Nouveau todo" en mode lecture
- Masquer le bouton "Ajouter un todo" en mode lecture
- Désactiver le drag & drop des cartes
- Passer `readOnly` au `TodoDetailDialog`

```typescript
interface ChantierTodoTabProps {
  chantierId: string;
  readOnly?: boolean;  // NOUVEAU
}

export const ChantierTodoTab = ({ chantierId, readOnly = false }: ChantierTodoTabProps) => {
  // ...

  // Header - masquer le bouton si readOnly
  {!readOnly && (
    <Button size="sm" onClick={() => setIsFormOpen(true)} className="gap-2">
      <Plus className="h-4 w-4" />
      Nouveau todo
    </Button>
  )}

  // Cartes - désactiver le drag si readOnly
  <KanbanTodoCard
    todo={todo}
    isOverdue={isOverdue(todo)}
    isDraggable={!readOnly && (column.id === "EN_COURS" || column.id === "TERMINE")}
    onClick={() => handleTodoClick(todo)}
  />

  // Bouton "Ajouter un todo" - masquer si readOnly
  {column.id === "A_FAIRE" && !readOnly && (
    <div className="p-3 border-t border-border/30">...</div>
  )}

  // Dialog de détail - passer readOnly
  <TodoDetailDialog
    open={isDetailOpen}
    onOpenChange={setIsDetailOpen}
    todo={selectedTodo}
    readOnly={readOnly}  // NOUVEAU
  />

  // Ne pas rendre le formulaire de création en mode readOnly
  {!readOnly && (
    <TodoFormDialog ... />
  )}
};
```

---

### 3. `src/components/chantier/tabs/TodoDetailDialog.tsx`

**Modifications :**
- Ajouter prop `readOnly?: boolean`
- Masquer le bouton "Valider" si readOnly
- Masquer le bouton "Supprimer" si readOnly
- Masquer le bouton "Sauvegarder" si readOnly
- Remplacer les inputs par du texte statique si readOnly
- Masquer la zone d'upload de fichiers si readOnly
- Masquer les options de suppression dans le menu des documents si readOnly

```typescript
interface TodoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: TodoChantier;
  readOnly?: boolean;  // NOUVEAU
}

export const TodoDetailDialog = ({ open, onOpenChange, todo, readOnly = false }: TodoDetailDialogProps) => {
  // ...

  // Mode lecture seule : affichage statique
  if (readOnly) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détail du Todo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Titre</Label><p className="font-medium">{todo.nom}</p></div>
            <div><Label>Description</Label><p>{todo.description || "Non renseigné"}</p></div>
            {/* ... autres champs en lecture seule ... */}
            {/* Documents : affichage sans options de suppression/upload */}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Mode édition : code existant
  return (...);
};
```

---

### 4. `src/components/chantier/tabs/ChantierKanbanTab.tsx`

**Modifications :**
- Ajouter prop `readOnly?: boolean`
- Masquer le bouton "Nouvelle tâche" en mode lecture
- Masquer le bouton "Ajouter une tâche" en mode lecture
- Passer `readOnly` au `TaskDetailDialog`

```typescript
interface ChantierKanbanTabProps {
  chantierId: string;
  readOnly?: boolean;  // NOUVEAU
}

export const ChantierKanbanTab = ({ chantierId, readOnly = false }: ChantierKanbanTabProps) => {
  // ...

  // Header - masquer le bouton si readOnly
  {!readOnly && (
    <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-2">
      <Plus className="h-4 w-4" />
      Nouvelle tâche
    </Button>
  )}

  // Bouton "Ajouter une tâche" - masquer si readOnly
  {column.id === "A_FAIRE" && !readOnly && (
    <div className="p-3 border-t border-border/30">...</div>
  )}

  // Dialog de détail - passer readOnly
  <TaskDetailDialog
    open={detailDialogOpen}
    onOpenChange={setDetailDialogOpen}
    tache={selectedTache}
    chantierId={chantierId}
    readOnly={readOnly}  // NOUVEAU
  />

  // Ne pas rendre le formulaire de création en mode readOnly
  {!readOnly && (
    <TaskFormDialog ... />
  )}
};
```

---

### 5. `src/components/chantier/planning/TaskDetailDialog.tsx` (déjà modifié)

Ce composant a normalement déjà une prop `readOnly`. Il faut vérifier qu'elle est bien utilisée et la propager depuis `ChantierKanbanTab`.

---

## Résumé des fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `ChantierDetail.tsx` | Passer `readOnly={isReadOnly}` à ChantierKanbanTab et ChantierTodoTab |
| `ChantierTodoTab.tsx` | Ajouter prop `readOnly`, masquer boutons création, désactiver drag |
| `TodoDetailDialog.tsx` | Ajouter prop `readOnly`, affichage statique en lecture seule |
| `ChantierKanbanTab.tsx` | Ajouter prop `readOnly`, masquer boutons création, propager au dialog |

## Comportement après correction

| Élément | Mode édition | Mode lecture (chef) |
|---------|--------------|---------------------|
| Bouton "Nouvelle tâche" | Visible | Masqué |
| Bouton "Nouveau todo" | Visible | Masqué |
| Drag & drop todos | Actif | Désactivé |
| Modifier un todo/tâche | Possible | Impossible |
| Supprimer un todo/tâche | Possible | Impossible |
| Upload documents | Possible | Impossible |
| Voir les détails | Possible | Possible (lecture seule) |
| Télécharger documents | Possible | Possible |
