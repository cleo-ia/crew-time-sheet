

## Plan: Masquer le toggle "Chantier école" pour les conducteurs

Le composant `ChantiersManager` est partagé entre la page admin (`/admin?tab=chantiers`) et la page conducteur (`/chantiers`). La distinction se fait via la prop `basePath`.

### Modification

**`src/components/admin/ChantiersManager.tsx`** :
1. Ajouter une prop `showEcoleToggle?: boolean` (défaut `true`) à l'interface `ChantiersManagerProps`.
2. Conditionner l'affichage du bloc Switch "Chantier école" (lignes ~290-299) à `showEcoleToggle !== false`.

**`src/pages/ChantiersPage.tsx`** :
1. Passer `showEcoleToggle={false}` au composant `ChantiersManager`.

Aucun changement côté admin -- le toggle reste visible par défaut.

