

## Objectif
Ajouter un bouton "Créer un utilisateur" dans l'onglet Utilisateurs du panel admin, permettant de pré-créer une fiche utilisateur (nom, prénom, email) sans envoyer d'invitation. L'invitation et l'attribution du rôle pourront être faites plus tard.

## Modification

### 1. Créer un dialog `CreateUserDialog`
- Nouveau composant `src/components/admin/CreateUserDialog.tsx`
- Champs : nom, prénom, email (optionnel)
- Pas de sélection de rôle (le rôle sera attribué à l'invitation)
- Utilise `useCreateUtilisateur` existant pour insérer dans `utilisateurs`
- Vérifie les doublons (déjà géré par le hook)

### 2. Modifier `UsersManager.tsx`
- Ajouter un bouton "Créer un utilisateur" à côté du bouton "Inviter"
- Ouvrir le `CreateUserDialog` au clic
- Invalider le cache après création pour rafraîchir la liste

## Détails techniques
- Le hook `useCreateUtilisateur` gère déjà : insertion avec `entreprise_id`, vérification de doublon, invalidation du cache React Query
- L'utilisateur créé apparaîtra dans la liste sans `auth_user_id` (pas encore connecté)
- Lors de l'invitation ultérieure, le trigger `handle_new_user_signup` liera automatiquement le compte Auth à la fiche existante via l'email

