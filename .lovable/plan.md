

# Accès lecture seule au Planning pour le rôle RH

## Objectif
Permettre à Tanguy (rôle RH) de consulter le planning main d'oeuvre sans pouvoir le modifier. Un onglet "Planning S+1" sera ajouté dans sa barre de navigation, au même niveau que ses autres onglets.

## Modifications

### 1. Route — `src/App.tsx` (L104)
Ajouter `"rh"` dans `allowedRoles` de `/planning-main-oeuvre` :
```
["super_admin", "conducteur", "admin", "rh"]
```

### 2. Navigation — `src/components/navigation/AppNav.tsx` (L94)
Ajouter `"rh"` dans `canSeePlanning` :
```
const canSeePlanning = userRole && ["super_admin", "conducteur", "admin", "rh"].includes(userRole);
```
Le bouton "Planning S+1" apparaitra automatiquement dans la nav pour le rôle RH (il est déjà rendu dans le bloc commun, pas dans un bloc conducteur-only).

### 3. Page Planning — `src/pages/PlanningMainOeuvre.tsx`

**a) Variable `isReadOnly`** (après L198) :
```typescript
const isReadOnly = userRole === "rh";
```

**b) Bouton retour** (L631) : pointer vers `/consultation-rh` si RH au lieu de `/validation-conducteur`.

**c) Bandeau de validation** (L666-758) : masquer les boutons d'action (Synchroniser, Modifier, Valider) quand `isReadOnly`. Le bandeau informatif (validé/non validé) reste visible.

**d) Bouton "Copier S-1"** (L799-806) : masquer quand `isReadOnly`.

**e) Callbacks PlanningChantierAccordion** (L853-862) : utiliser le même pattern que `isPlanningLocked` — passer `undefined` quand `isReadOnly || isPlanningLocked` pour :
- `onDayToggle`, `onVehiculeChange`, `onRemoveEmploye`, `onAddEmploye`, `onSetChefResponsable`
- `onHeuresChange`, `onInsertionChange` aussi en `undefined` pour RH

**f) Export Excel et recherche** : restent accessibles (aucun changement).

### Aucune modification base de données
Le rôle `rh` existe déjà. Seuls le routage et l'UI sont impactés. Zero impact sur les conducteurs — `isReadOnly` est strictement `userRole === "rh"`.

