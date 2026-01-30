
# Plan : Nettoyer l'invitation Jorge Martins pour recommencer

## Situation actuelle

L'invitation pour `jorge.martins@groupe-engo.com` (SDER) a été consommée prématurément par le scan Outlook Safe Links. Un compte auth a été créé mais sans mot de passe défini par l'utilisateur.

## Actions à effectuer

### Étape 1 : Supprimer l'utilisateur auth via edge function

Appeler l'edge function `delete-user` pour supprimer proprement :
- L'entrée dans `auth.users`
- Le profile associé

```typescript
// Appel à l'edge function delete-user
POST /delete-user
{
  "userId": "b801200a-7906-4612-9b87-81ea274a201e"
}
```

### Étape 2 : Supprimer l'invitation

```sql
DELETE FROM invitations 
WHERE id = 'b3033050-77d2-4b37-9200-db7a1bf9c154';
```

### Étape 3 : Réinitialiser le lien auth_user_id (si nécessaire)

La fiche RH dans `utilisateurs` n'a pas de `auth_user_id` donc elle est déjà prête pour être ré-associée.

## Résultat attendu

Après ces opérations :
- Aucune invitation pour Jorge Martins
- Aucun compte auth pour Jorge Martins  
- La fiche RH `utilisateurs` reste intacte (id: `9f1e3a0f-7f14-4521-99db-4fe6d8722374`)
- Tu peux renvoyer une nouvelle invitation depuis le panneau admin SDER

## Fichiers concernés

Aucune modification de code nécessaire - uniquement des opérations sur la base de données via :
- Edge function `delete-user` existante
- Requête SQL de suppression d'invitation
