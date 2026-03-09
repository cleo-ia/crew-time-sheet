

## Retrait du bouton "Créer un utilisateur" pour le rôle gestionnaire

### Modification unique

**Fichier :** `src/components/admin/UsersManager.tsx`

Le bouton "Créer un utilisateur" et le `<CreateUserDialog>` associé sont actuellement affichés sans condition de rôle. Il faut :

1. Importer `useCurrentUserRole` dans `UsersManager.tsx`
2. Récupérer le rôle courant via `const { data: userRole } = useCurrentUserRole()`
3. Conditionner l'affichage du bouton et du dialog avec `userRole !== 'gestionnaire'`

Aucune autre modification nécessaire — le bouton "Inviter un utilisateur" dans le header de `AdminPanel.tsx` est déjà masqué pour les gestionnaires.

