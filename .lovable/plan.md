
# Plan : Accès Lecture Seule au Planning Gantt pour les Chefs

## Objectif

Permettre aux chefs de chantier (ex: "Thomas TEST") de **visualiser** le planning Gantt de leur chantier assigné depuis leur espace, mais **sans possibilité de modification**.

## Comportement attendu

1. Le chef se connecte et arrive sur sa page "Saisie hebdomadaire" (`/`)
2. Il sélectionne un chantier ou voit son chantier assigné
3. Un nouveau bouton **"Voir le planning"** apparaît à côté du sélecteur de chantier
4. Clic sur ce bouton → Il accède à `/chantiers/:id` avec le planning Gantt
5. **Mode lecture seule** : 
   - Il peut naviguer dans le Gantt (zoom, scroll, aujourd'hui)
   - Il peut cliquer sur une tâche pour voir les détails
   - Il **ne peut PAS** créer, modifier, supprimer ou déplacer des tâches
6. Bouton "← Retour" → Revient à `/` (sa page de saisie)

## Architecture technique

```text
useCurrentUserRole() → role = "chef"
        ↓
ChantierPlanningTab(readOnly=true)
        ↓
  ┌─────────────────────────────────────┐
  │  - Bouton "+" masqué                │
  │  - TaskBars: drag&drop désactivé    │
  │  - TaskDetailDialog: lecture seule  │
  │  - Export Excel toujours dispo      │
  └─────────────────────────────────────┘
```

## Fichiers à modifier

### 1. `src/App.tsx`
**Action** : MODIFIER

Ajouter le rôle `chef` aux routes autorisées pour `/chantiers/:id` :

```typescript
<Route 
  path="/chantiers/:id" 
  element={
    <RequireRole allowedRoles={["super_admin", "conducteur", "chef"]}>
      <ChantierDetail />
    </RequireRole>
  } 
/>
```

Note : Les chefs n'ont **pas** accès à `/chantiers` (liste complète), uniquement à `/chantiers/:id` (détail d'un chantier spécifique).

### 2. `src/pages/Index.tsx`
**Action** : MODIFIER

Ajouter un bouton "Voir le planning" visible quand un chantier est sélectionné :

- Importer `CalendarDays` de lucide-react et `useNavigate`
- Ajouter le bouton à côté du label "Choisir un chantier" (ligne ~553-558)

```typescript
<div>
  <div className="flex items-center justify-between mb-2">
    <label className="text-sm font-medium text-foreground flex items-center gap-2">
      <Users className="h-4 w-4 text-primary" />
      Choisir un chantier
    </label>
    {selectedChantier && (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 gap-1 text-xs px-2"
        onClick={() => navigate(`/chantiers/${selectedChantier}`)}
      >
        <CalendarDays className="h-3 w-3" />
        Planning
      </Button>
    )}
  </div>
  <ChantierSelector ... />
</div>
```

### 3. `src/components/chantier/ChantierDetailHeader.tsx`
**Action** : MODIFIER

Adapter le lien retour pour les chefs → retour vers `/` au lieu de `/chantiers`.

Utiliser le hook `useCurrentUserRole` pour détecter si l'utilisateur est un chef :

```typescript
const { data: userRole } = useCurrentUserRole();

const backPath = useMemo(() => {
  if (location.pathname.startsWith("/admin")) {
    return "/admin?tab=chantiers";
  }
  // Chef retourne vers sa page de saisie
  if (userRole === "chef") {
    return "/";
  }
  return "/chantiers";
}, [location.pathname, userRole]);
```

### 4. `src/pages/ChantierDetail.tsx`
**Action** : MODIFIER

Récupérer le rôle utilisateur et passer `readOnly={true}` au composant `ChantierPlanningTab` si le rôle est "chef" :

```typescript
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";

const { data: userRole } = useCurrentUserRole();
const isReadOnly = userRole === "chef";

// Dans le rendu :
<ChantierPlanningTab 
  chantierId={chantier.id} 
  chantierNom={chantier.nom}
  readOnly={isReadOnly}
/>
```

### 5. `src/components/chantier/tabs/ChantierPlanningTab.tsx`
**Action** : MODIFIER

Ajouter la prop `readOnly` et conditionner l'affichage :

```typescript
interface ChantierPlanningTabProps {
  chantierId: string;
  chantierNom?: string;
  readOnly?: boolean;  // Nouvelle prop
}

// Dans le composant :
export const ChantierPlanningTab = ({ chantierId, chantierNom, readOnly = false }: ChantierPlanningTabProps) => {
  // ...

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex ...">
        {/* ... navigation buttons restent visibles ... */}
        
        <div className="flex items-center gap-4">
          {/* Show dates toggle - toujours visible */}
          {/* Zoom selector - toujours visible */}

          {/* Add task button - masqué en readOnly */}
          {!readOnly && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => setShowCreateDialog(true)} ...>
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Ajouter une tâche</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Export Excel - toujours visible */}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg ...">
        <EmptyGanttGrid ...>
          {taches.length > 0 && (
            <TaskBars
              ...
              readOnly={readOnly}  // Nouvelle prop
            />
          )}
          ...
        </EmptyGanttGrid>
      </div>

      {/* Dialogs */}
      {!readOnly && (
        <TaskFormDialog ... />
      )}
      
      <TaskDetailDialog
        ...
        readOnly={readOnly}  // Nouvelle prop
      />
    </div>
  );
};
```

### 6. `src/components/chantier/planning/TaskBars.tsx`
**Action** : MODIFIER

Ajouter la prop `readOnly` et désactiver le drag & drop :

```typescript
interface TaskBarsProps {
  taches: TacheChantier[];
  startDate: Date;
  zoomLevel: ZoomLevel;
  onTaskClick: (tache: TacheChantier) => void;
  chantierId: string;
  scrollContainerRef?: RefObject<EmptyGanttGridRef>;
  readOnly?: boolean;  // Nouvelle prop
}

export const TaskBars = ({
  taches, 
  startDate, 
  zoomLevel, 
  onTaskClick,
  chantierId,
  scrollContainerRef,
  readOnly = false,  // Valeur par défaut
}: TaskBarsProps) => {
  // ...

  // Désactiver handleMouseDown en mode readOnly
  const handleMouseDown = useCallback((e: React.MouseEvent, tache: TacheChantier, currentLeft: number, currentRow: number) => {
    if (readOnly) return;  // Bloquer le drag en lecture seule
    // ... reste du code
  }, [readOnly]);

  // Dans le rendu, changer le cursor :
  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {taskPositions.map((...) => (
        <div
          key={tache.id}
          className={`... ${
            readOnly 
              ? "cursor-pointer hover:brightness-95" 
              : isDragging 
                ? "cursor-grabbing" 
                : "cursor-grab hover:brightness-95 hover:shadow-md"
          }`}
          onMouseDown={readOnly ? undefined : (e) => handleMouseDown(e, tache, left, row)}
          onClick={(e) => handleClick(e, tache)}
        >
          ...
        </div>
      ))}
    </div>
  );
};
```

### 7. `src/components/chantier/planning/TaskDetailDialog.tsx`
**Action** : MODIFIER

Ajouter la prop `readOnly` et afficher les informations sans possibilité d'édition :

```typescript
interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tache: TacheChantier | null;
  chantierId: string;
  initialTab?: "recap" | "date" | "rentabilite" | "fichiers";
  readOnly?: boolean;  // Nouvelle prop
}

export const TaskDetailDialog = ({ 
  open, onOpenChange, tache, chantierId, initialTab = "recap", 
  readOnly = false  // Valeur par défaut
}: TaskDetailDialogProps) => {
  // ...

  return (
    <Dialog ...>
      <DialogContent ...>
        {/* Header */}
        <div className="p-5 pb-4 border-b ...">
          {/* Titre : Input éditable ou texte statique */}
          {readOnly ? (
            <h2 className="text-2xl font-bold">{formData.nom}</h2>
          ) : (
            <Input
              value={formData.nom}
              onChange={(e) => handleFieldChange("nom", e.target.value)}
              onBlur={handleFieldBlur}
              ...
            />
          )}
          
          {/* Menu actions (supprimer) - masqué en readOnly */}
          {!readOnly && (
            <DropdownMenu>
              ...
            </DropdownMenu>
          )}
        </div>

        {/* Tabs content */}
        <TabsContent value="recap">
          {/* Statut : Select ou Badge statique */}
          {readOnly ? (
            <Badge className={`${statusInfo.badgeBg} ${statusInfo.textColor}`}>
              {statusInfo.label}
            </Badge>
          ) : (
            <Select value={formData.statut} onValueChange={...}>
              ...
            </Select>
          )}

          {/* Dates : Boutons de sélection ou texte */}
          {readOnly ? (
            <span className="text-sm font-medium">{formatDateDisplay(formData.date_debut)}</span>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button ...>...</Button>
              </PopoverTrigger>
              ...
            </Popover>
          )}

          {/* Description : Textarea ou paragraphe */}
          {readOnly ? (
            <p className="text-sm">{formData.description || "Aucune description"}</p>
          ) : (
            <Textarea
              value={formData.description}
              onChange={...}
              ...
            />
          )}
        </TabsContent>

        {/* Tab Fichiers : Upload masqué en readOnly, téléchargement reste dispo */}
        <TabsContent value="fichiers">
          {!readOnly && (
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload /> Ajouter un fichier
            </Button>
          )}
          {/* Liste des fichiers avec téléchargement toujours possible */}
        </TabsContent>
      </DialogContent>
    </Dialog>
  );
};
```

## Résumé des modifications

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/App.tsx` | MODIFIER | Ajouter `"chef"` aux rôles pour `/chantiers/:id` |
| `src/pages/Index.tsx` | MODIFIER | Ajouter bouton "Planning" quand chantier sélectionné |
| `src/components/chantier/ChantierDetailHeader.tsx` | MODIFIER | Retour vers `/` si chef |
| `src/pages/ChantierDetail.tsx` | MODIFIER | Passer `readOnly={true}` si chef |
| `src/components/chantier/tabs/ChantierPlanningTab.tsx` | MODIFIER | Prop `readOnly`, masquer bouton "+" |
| `src/components/chantier/planning/TaskBars.tsx` | MODIFIER | Prop `readOnly`, désactiver drag&drop |
| `src/components/chantier/planning/TaskDetailDialog.tsx` | MODIFIER | Prop `readOnly`, afficher en lecture seule |

## Permissions et sécurité

- Route `/chantiers/:id` protégée par `RequireRole` : `super_admin`, `conducteur`, `chef`
- Route `/chantiers` (liste) reste réservée aux `super_admin` et `conducteur`
- Les chefs ne voient que leurs chantiers assignés grâce au filtrage existant
- Mode `readOnly` empêche toute modification côté UI
- Les RLS policies existantes protègent les données côté serveur

## Ce que le chef peut faire

- Naviguer dans le Gantt (zoom, scroll, bouton "Aujourd'hui")
- Cliquer sur une tâche pour voir ses détails (dates, description, statut, fichiers)
- Télécharger les fichiers attachés aux tâches
- Exporter le planning en Excel

## Ce que le chef ne peut PAS faire

- Créer une nouvelle tâche (bouton "+" masqué)
- Modifier les dates par drag & drop (désactivé)
- Modifier le nom, statut, description d'une tâche (inputs remplacés par texte)
- Supprimer une tâche (menu supprimé)
- Uploader des fichiers (bouton masqué)
