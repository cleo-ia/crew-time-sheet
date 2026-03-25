

# Corriger la recherche d'email dans le rappel urgent

## Problème
L'Edge Function `rappel-urgence-export` et le hook `useFicheBlockDetail` utilisent la table `profiles` avec un `utilisateurs.id`, alors que `profiles` est indexée par `auth.users.id`. L'ID ne correspond pas, d'où l'erreur "Profil non trouvé".

## Corrections

### 1. Edge Function `supabase/functions/rappel-urgence-export/index.ts`
Remplacer la requête sur `profiles` par une requête sur `utilisateurs` :
```typescript
// AVANT (ligne 41-47)
const { data: profile } = await supabase
  .from('profiles')
  .select('id, email, first_name, last_name')
  .eq('id', targetUserId)
  .maybeSingle()

// APRÈS
const { data: profile } = await supabase
  .from('utilisateurs')
  .select('id, email, prenom, nom')
  .eq('id', targetUserId)
  .maybeSingle()
```
Adapter ensuite les références : `profile.first_name` → `profile.prenom`, `profile.last_name` → `profile.nom`.

### 2. Hook `src/hooks/useFicheBlockDetail.ts`
Remplacer la requête sur `profiles` (lignes 98-108) par une requête sur `utilisateurs` pour récupérer les emails du chef et du conducteur, puisque `chefId`/`conducteurId` sont des `utilisateurs.id`.

### 3. Redéployer l'Edge Function
Appeler `deploy_edge_functions` pour `rappel-urgence-export` après la modification.

