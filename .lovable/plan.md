

# Correction de la comparaison case-sensitive des emails

## Problème identifié
L'invitation envoyée à `Jorge.martins@groupe-engo.com` (J majuscule) n'a pas été liée à la fiche RH existante car :
- L'Edge Function `invite-user` convertit l'email en minuscules (`email.toLowerCase()`)
- La requête SQL compare avec `=` (case-sensitive) : `jorge.martins` ≠ `Jorge.martins`
- Résultat : Supabase Auth crée un nouveau compte et le trigger crée un doublon

## Solution

### 1. Modifier l'Edge Function `invite-user`
**Fichier** : `supabase/functions/invite-user/index.ts`

Changer la requête de recherche utilisateurs (lignes 237-242) :

```typescript
// AVANT
const { data: existingUtilisateur } = await supabaseAdmin
  .from('utilisateurs')
  .select('id, prenom, nom, role_metier')
  .eq('email', email.toLowerCase())
  .eq('entreprise_id', finalEntrepriseId)
  .maybeSingle();

// APRÈS
const { data: existingUtilisateur } = await supabaseAdmin
  .from('utilisateurs')
  .select('id, prenom, nom, role_metier')
  .ilike('email', email.trim())
  .eq('entreprise_id', finalEntrepriseId)
  .maybeSingle();
```

### 2. Modifier le trigger `handle_new_user_signup`
**Migration SQL** :

```sql
-- Recherche invitation : case-insensitive
SELECT * INTO invitation_record
FROM public.invitations
WHERE LOWER(email) = LOWER(user_email)
  AND status = 'pending'
  AND expires_at > now()
LIMIT 1;

-- Recherche utilisateurs : case-insensitive  
SELECT id INTO existing_utilisateur_id
FROM public.utilisateurs
WHERE LOWER(email) = LOWER(user_email)
LIMIT 1;
```

## Pourquoi aucune régression ?

| Scénario existant | Impact |
|---|---|
| Philippe Fay (`philippe.fay@...`) - email déjà en minuscules | Aucun changement - continue de matcher |
| Connexion utilisateurs existants | Non impacté - comparaison sur auth_user_id |
| Multi-entreprises | Non impacté - filtre `entreprise_id` préservé |
| Magic links / OTP | Non impacté - passe par Supabase Auth directement |
| Validation regex email | Déjà case-insensitive (flag `/i`) |

## Après correction : Fusion des doublons Jorge Martins

Une migration séparée fusionnera les deux enregistrements :
1. Transférer `auth_user_id` de `fdf8b8bb-...` vers `9f1e3a0f-...`
2. Supprimer le doublon `fdf8b8bb-...`
3. Nettoyer les entrées orphelines dans `profiles` et `user_roles`

## Fichiers modifiés
- `supabase/functions/invite-user/index.ts` - Comparaison ILIKE
- Migration SQL - Trigger `handle_new_user_signup` case-insensitive

