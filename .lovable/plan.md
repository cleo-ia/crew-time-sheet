
# Mode lecture seule complet pour les chefs dans TaskDetailDialog

## Problème identifié

Le `TaskDetailDialog` ne respecte pas correctement la prop `readOnly` dans plusieurs onglets :

| Onglet | Problème |
|--------|----------|
| **Date** | Tous les inputs (dates, heures, montant) restent éditables |
| **Rentabilité** | Bouton "Ajouter un achat" visible |
| **Footer** | Zone de commentaire active |

## Spécification confirmée

- **Mode lecture seule** : Dates, heures, montants, status, description → NON modifiables
- **Uploads autorisés** : Les chefs peuvent toujours ajouter des fichiers

## Fichier à modifier

### `src/components/chantier/planning/TaskDetailDialog.tsx`

### Modification 1 : Onglet "Date" (lignes ~504-575)

Remplacer les inputs éditables par des affichages statiques en mode `readOnly` :

**Avant** :
```tsx
<TabsContent value="date" className="p-5 space-y-5 mt-0 flex-1 overflow-y-auto">
  <h4>Date estimée</h4>
  <div className="grid grid-cols-2 gap-6">
    <Input type="date" value={formData.date_debut} onChange={...} />
    <Input type="date" value={formData.date_fin} onChange={...} />
  </div>
  <h4>Heures</h4>
  <Input type="number" value={formData.heures_estimees} onChange={...} />
  <Input type="number" value={formData.heures_realisees} onChange={...} />
  <h4>Montant vendu</h4>
  <Input type="number" value={formData.montant_vendu} onChange={...} />
</TabsContent>
```

**Après** :
```tsx
<TabsContent value="date" className="p-5 space-y-5 mt-0 flex-1 overflow-y-auto">
  <h4>Date estimée</h4>
  <div className="grid grid-cols-2 gap-6">
    <div className="space-y-2">
      <span className="text-sm text-muted-foreground">Date de début</span>
      {readOnly ? (
        <p className="text-sm font-medium h-10 flex items-center bg-muted/30 px-3 rounded-md">
          {formatDateDisplay(formData.date_debut)}
        </p>
      ) : (
        <Input type="date" value={formData.date_debut} onChange={...} />
      )}
    </div>
    <div className="space-y-2">
      <span className="text-sm text-muted-foreground">Date de fin</span>
      {readOnly ? (
        <p className="text-sm font-medium h-10 flex items-center bg-muted/30 px-3 rounded-md">
          {formatDateDisplay(formData.date_fin)}
        </p>
      ) : (
        <Input type="date" value={formData.date_fin} onChange={...} />
      )}
    </div>
  </div>
  
  <h4>Heures</h4>
  <div className="grid grid-cols-2 gap-6">
    <div className="space-y-2">
      <span className="text-sm text-muted-foreground">Heures estimées</span>
      {readOnly ? (
        <p className="text-sm font-medium h-10 flex items-center bg-muted/30 px-3 rounded-md">
          {formData.heures_estimees || "0"}
        </p>
      ) : (
        <Input type="number" value={formData.heures_estimees} onChange={...} />
      )}
    </div>
    <div className="space-y-2">
      <span className="text-sm text-muted-foreground">Heures réalisées</span>
      {readOnly ? (
        <p className="text-sm font-medium h-10 flex items-center bg-muted/30 px-3 rounded-md">
          {formData.heures_realisees || "0"}
        </p>
      ) : (
        <Input type="number" value={formData.heures_realisees} onChange={...} />
      )}
    </div>
  </div>
  
  <h4>Montant vendu</h4>
  <div className="space-y-2">
    {readOnly ? (
      <p className="text-sm font-medium h-10 flex items-center bg-muted/30 px-3 rounded-md">
        {formData.montant_vendu || "0"} €
      </p>
    ) : (
      <Input type="number" value={formData.montant_vendu} onChange={...} />
    )}
    <span className="text-xs text-muted-foreground">Montant en euros (€)</span>
  </div>
</TabsContent>
```

### Modification 2 : Onglet "Rentabilité" (lignes ~640-650)

Masquer le bouton "Ajouter un achat" en mode lecture seule :

```tsx
{achatsForTask.length > 0 ? (
  // ... liste des achats
) : (
  <div className="p-8 text-center">
    <p className="text-sm text-muted-foreground mb-4">Aucun achat ajouté</p>
    {!readOnly && (
      <div className="flex items-center justify-center gap-3">
        <Button variant="default" size="sm" className="bg-orange-500 hover:bg-orange-600 h-9 px-4">
          Ajouter un achat
        </Button>
        <Button variant="outline" size="sm" className="gap-2 h-9 px-4">
          <span className="text-muted-foreground">⏵</span>
          Tutoriel vidéo
        </Button>
      </div>
    )}
  </div>
)}
```

### Modification 3 : Footer commentaires (lignes ~860-873)

Masquer la zone de commentaire en mode lecture seule :

```tsx
{/* Footer - Comment section - hidden in readOnly mode */}
{!readOnly && (
  <div className="border-t p-4 flex items-center gap-3 shrink-0 bg-muted/20">
    <Input
      value={comment}
      onChange={(e) => setComment(e.target.value)}
      placeholder="Commentez ici ..."
      className="flex-1 h-10 bg-background"
    />
    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-lg">
      <Plus className="h-4 w-4" />
    </Button>
    <Button size="icon" className="h-10 w-10 shrink-0 rounded-lg bg-orange-500 hover:bg-orange-600">
      <Send className="h-4 w-4" />
    </Button>
  </div>
)}
```

### Modification 4 : Onglet "Fichiers" - Conserver les uploads (déjà OK)

L'onglet Fichiers (lignes 657-856) **conserve déjà** la fonctionnalité d'upload pour les chefs car les conditions `{!readOnly && ...}` ne s'appliquent qu'à :
- Le bouton de suppression dans le menu déroulant des documents
- Aucune modification nécessaire pour permettre les uploads

**Vérification** : Les lignes 681-690 et 694-707 montrent que la zone d'upload et le bouton "+" sont actuellement masqués en mode `readOnly`. Selon votre demande ("Uploads autorisés"), ces sections doivent rester **visibles** même en mode `readOnly`.

**Correction requise** : Supprimer la condition `{!readOnly && ...}` autour de la zone d'upload dans l'onglet Fichiers pour permettre aux chefs d'ajouter des fichiers.

```tsx
// Ligne 679-706 - Supprimer la condition readOnly pour garder l'upload actif
<div className="flex items-center justify-between mb-3">
  <h4 className="font-semibold text-base">Fichiers</h4>
  {/* Bouton + toujours visible, même en readOnly */}
  <Button 
    variant="outline" 
    size="icon" 
    className="h-8 w-8 rounded-lg"
    onClick={() => fileInputRef.current?.click()}
  >
    <Plus className="h-4 w-4" />
  </Button>
</div>

{/* Zone d'upload toujours visible */}
<div
  className="border-2 border-dashed border-border/50 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer mb-4"
  onClick={() => fileInputRef.current?.click()}
>
  <Upload className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
  <p className="text-sm text-muted-foreground">
    Cliquez pour ajouter des fichiers
  </p>
  <p className="text-xs text-muted-foreground mt-1">
    PDF, JPG, PNG (max 10 MB)
  </p>
</div>

{/* Mais le bouton Supprimer reste masqué en readOnly */}
{!readOnly && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => setDocToDelete(doc)} className="text-destructive">
      <Trash2 className="h-4 w-4 mr-2" />
      Supprimer
    </DropdownMenuItem>
  </>
)}
```

## Résumé des modifications

| Élément | Mode édition | Mode lecture (chef) |
|---------|--------------|---------------------|
| Titre de tâche | Éditable | Texte statique ✓ (déjà OK) |
| Statut | Dropdown | Badge statique ✓ (déjà OK) |
| Dates (début/fin) | Input date | **Texte statique** |
| Heures estimées | Input number | **Texte statique** |
| Heures réalisées | Input number | **Texte statique** |
| Montant vendu | Input number | **Texte statique** |
| Bouton "Ajouter achat" | Visible | **Masqué** |
| Zone commentaires | Visible | **Masquée** |
| Upload fichiers | ✓ | ✓ **Conservé** |
| Supprimer fichiers | ✓ | Masqué ✓ (déjà OK) |
| Bouton suppression tâche | Visible | Masqué ✓ (déjà OK) |

## Note technique

Les modifications sont uniquement côté **frontend**. Les politiques RLS actuelles sur `taches_chantier` permettent encore les écritures pour tous les utilisateurs authentifiés. Une future amélioration pourrait restreindre les écritures au niveau base de données pour les rôles `chef`, mais cela n'est pas dans le périmètre de cette correction.
