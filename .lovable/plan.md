
# Plan : Accès Chantiers pour les Conducteurs

## Contexte

Les conducteurs de travaux doivent pouvoir accéder à la liste complète des chantiers de leur entreprise pour :
- Consulter et tester les plannings Gantt
- Créer de nouveaux chantiers
- Modifier les chantiers existants

Actuellement, cette fonctionnalité n'est accessible que via `/admin`, réservée aux rôles admin/gestionnaire/rh.

## Solution proposée

Créer une nouvelle route `/chantiers` dédiée aux conducteurs avec accès complet (CRUD) sur les chantiers, sans passer par l'interface d'administration.

## Architecture

```text
+------------------+     +----------------------+     +-------------------+
|   AppNav.tsx     |     |  ChantiersPage.tsx   |     | ChantierDetail    |
|  (Bouton Chantiers) --> |  (Liste + CRUD)      | --> | /chantiers/:id    |
|  role: conducteur|     |  Réutilise           |     | (Planning, Gantt) |
+------------------+     |  ChantiersManager    |     +-------------------+
                         +----------------------+
```

## Fichiers à créer

### 1. Nouvelle page : `src/pages/ChantiersPage.tsx`

Page dédiée pour les conducteurs, intégrant le composant `ChantiersManager` existant.

Structure :
- AppNav (navigation)
- PageHeader avec titre "Mes Chantiers"
- ChantiersManager (composant existant, réutilisé tel quel)

### 2. Modifier `src/components/admin/ChantiersManager.tsx`

Ajouter une prop optionnelle `basePath` pour contrôler la route de navigation vers les détails :
- Par défaut : `/admin/chantiers/:id` (comportement actuel)
- Pour conducteurs : `/chantiers/:id`

Modification ligne 179 :
```typescript
// Avant
onDoubleClick={() => navigate(`/admin/chantiers/${chantier.id}`)}

// Après
onDoubleClick={() => navigate(`${basePath || '/admin/chantiers'}/${chantier.id}`)}
```

## Fichiers à modifier

### 3. `src/App.tsx` - Ajouter les nouvelles routes

Ajouter 2 routes accessibles aux conducteurs :

```typescript
// Route liste des chantiers
<Route 
  path="/chantiers" 
  element={
    <RequireRole allowedRoles={["super_admin", "conducteur"]}>
      <ChantiersPage />
    </RequireRole>
  } 
/>

// Route détail chantier (réutilise ChantierDetail existant)
<Route 
  path="/chantiers/:id" 
  element={
    <RequireRole allowedRoles={["super_admin", "conducteur"]}>
      <ChantierDetail />
    </RequireRole>
  } 
/>
```

### 4. `src/components/navigation/AppNav.tsx` - Ajouter le bouton navigation

Ajouter un bouton "Chantiers" visible pour les conducteurs :

```typescript
const canSeeChantiers = userRole && ["super_admin", "conducteur"].includes(userRole);

// Dans le JSX, après le bouton Planning S+1 :
{canSeeChantiers && (
  <Button
    asChild
    variant="ghost"
    size="sm"
    className={getButtonClasses("/chantiers", "validation-conducteur")}
    style={getButtonStyle("/chantiers", "validation-conducteur")}
  >
    <Link to="/chantiers">
      <Building2 className="h-4 w-4" />
      Chantiers
    </Link>
  </Button>
)}
```

### 5. `src/pages/ChantierDetail.tsx` - Navigation retour dynamique

Modifier le header pour détecter d'où vient l'utilisateur et adapter le lien retour :
- Si vient de `/chantiers` → retour vers `/chantiers`
- Si vient de `/admin` → retour vers `/admin?tab=chantiers`

## Résumé des modifications

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/pages/ChantiersPage.tsx` | CRÉER | Nouvelle page liste chantiers pour conducteurs |
| `src/components/admin/ChantiersManager.tsx` | MODIFIER | Ajouter prop `basePath` pour navigation flexible |
| `src/App.tsx` | MODIFIER | Ajouter routes `/chantiers` et `/chantiers/:id` |
| `src/components/navigation/AppNav.tsx` | MODIFIER | Ajouter bouton "Chantiers" pour conducteurs |
| `src/pages/ChantierDetail.tsx` | MODIFIER | Navigation retour contextuelle |

## Permissions et sécurité

- Routes protégées par `RequireRole` : seuls `super_admin` et `conducteur` peuvent accéder
- Les données sont déjà filtrées par `entreprise_id` via le hook `useChantiers`
- Les RLS policies existantes s'appliquent automatiquement

## Comportement attendu

1. Un conducteur se connecte
2. Il voit le nouveau bouton "Chantiers" dans la navigation (après "Planning S+1")
3. Clic → accède à `/chantiers` avec la liste complète des chantiers de son entreprise
4. Il peut créer, modifier, supprimer des chantiers
5. Double-clic sur un chantier → `/chantiers/:id` avec le planning Gantt, fichiers, todos, etc.
6. Bouton retour → revient à `/chantiers`

## Note importante

Les admins conservent leur accès via `/admin?tab=chantiers` avec toutes les fonctionnalités. Les deux routes coexistent et utilisent les mêmes composants/données.
