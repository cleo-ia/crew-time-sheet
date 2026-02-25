

## Correction : noms "Inconnu" dans les conversations

**Problème** : Dans `useMessages.ts` ligne 46, on cherche les auteurs avec `.in("id", authorIds)` mais `author_id` contient l'`auth.uid()` (UUID Supabase Auth), tandis que `utilisateurs.id` est l'ID interne. La jointure échoue → "Inconnu".

**Correction** dans `src/hooks/useMessages.ts` :
1. Ligne 46 : `.in("id", authorIds)` → `.in("auth_user_id", authorIds)`
2. Ligne 49 : `new Map(authors?.map((a) => [a.id, a])` → `new Map(authors?.map((a) => [a.auth_user_id, a])` pour que le lookup par `author_id` fonctionne

C'est une correction de 2 lignes, rien d'autre à changer.

