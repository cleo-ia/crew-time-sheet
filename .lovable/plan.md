

## Objectif
Ajouter un sélecteur de rôle métier dans le dialog "Créer un utilisateur" pour pouvoir pré-assigner un rôle à l'utilisateur créé.

## Contexte important
Il y a deux types de rôles dans l'application :
- **`role_metier`** (table `utilisateurs`) : chef, conducteur, macon, finisseur, grutier, interimaire — rôle opérationnel, stocké directement sur la fiche
- **Rôle d'accès** (table `user_roles`) : admin, gestionnaire, rh, conducteur, chef — attribué uniquement à l'invitation (quand l'utilisateur a un compte Auth)

Pour Carole (gestionnaire), le `role_metier` n'est pas nécessaire — son rôle "gestionnaire" sera attribué au moment de l'invitation lundi. Mais pour d'autres utilisateurs (chefs, conducteurs, maçons...) le `role_metier` est utile dès la pré-création.

## Modification

### `src/components/admin/CreateUserDialog.tsx`
- Ajouter un `Select` pour le champ `role_metier` (optionnel)
- Options : Chef de chantier, Conducteur, Maçon, Finisseur, Grutier, Intérimaire
- Passer la valeur à `createUtilisateur.mutateAsync({ ..., role_metier })`
- Réinitialiser le champ à la fermeture
- Le hook `useCreateUtilisateur` accepte déjà `role_metier` en paramètre

