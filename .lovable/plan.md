

# Suppression du compte auth orphelin Jorge Martins

## Problème identifié

L'erreur `AuthApiError: A user with this email address has already been registered` indique que le compte existe toujours dans `auth.users` (table système de Supabase Auth).

**Historique** :
1. Lors de la première inscription, un compte auth a été créé avec l'ID `fdf8b8bb-9af9-4da6-bd12-aa491b992506`
2. Nous avons nettoyé `utilisateurs`, `profiles`, `user_roles`
3. **MAIS** le compte dans `auth.users` n'a pas été supprimé

## Solution

Appeler l'Edge Function `delete-user` avec l'ID `fdf8b8bb-9af9-4da6-bd12-aa491b992506` pour supprimer le compte auth orphelin.

## Actions à effectuer

1. **Appeler l'Edge Function `delete-user`** avec le userId `fdf8b8bb-9af9-4da6-bd12-aa491b992506`
2. L'API `supabaseAdmin.auth.admin.deleteUser()` supprimera le compte auth
3. Réessayer l'invitation pour Jorge.martins@groupe-engo.com

## Code technique

L'Edge Function `delete-user` utilise cette logique :
```typescript
const authUserId = utilisateurData?.auth_user_id || userId;
const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
```

Même si l'utilisateur n'existe plus dans la table `utilisateurs`, la fonction tentera de supprimer le compte auth avec l'ID fourni.

