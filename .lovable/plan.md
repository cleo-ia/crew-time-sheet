

## Plan : Dropdown utilisateur alimenté par la base selon le rôle sélectionné

### Problème actuel
Le filtre "Rôle" filtre côté client sur `user_role` dans `fiches_modifications`, mais cette colonne est `NULL` partout. Résultat : aucun utilisateur ne s'affiche quand on filtre par rôle.

### Solution

**1. Nouveau fichier : `src/hooks/useUtilisateursByAuthRole.ts`**

Hook qui interroge `user_roles` (filtré par `role` + `entreprise_id`) puis joint avec `utilisateurs` (via `auth_user_id`) pour récupérer prénom/nom. Fallback sur `profiles` pour les users sans entrée dans `utilisateurs`. Retourne `{ id: string, name: string }[]`.

**2. Modifier : `src/components/admin/HistoriqueManager.tsx`**

- Importer et appeler `useUtilisateursByAuthRole(roleFilter !== "all" ? roleFilter : null, entrepriseId)`
- Le dropdown "Utilisateur" affiche :
  - Si un rôle est sélectionné → la liste venant du hook (utilisateurs ayant ce rôle auth)
  - Si "Tous les rôles" → fallback sur la liste extraite des modifications (comportement actuel)
- Supprimer le filtre client-side `filteredModifications` par `user_role` (inutile puisque `user_role` est `NULL`). Les modifications sont filtrées par `user_id` côté serveur via `useModificationsHistory`.
- Quand on sélectionne un utilisateur, on passe son `user_id` auth à `useModificationsHistory` qui filtre par `user_id` côté Supabase.

**Gestion des actions système / "Tous les rôles" :**
- Quand `roleFilter === "all"`, aucun filtre par rôle n'est appliqué → toutes les modifications s'affichent, y compris les actions automatiques/système.
- Le dropdown utilisateur montre alors la liste extraite des modifications existantes (comme avant).

### Flux utilisateur
1. Sélection rôle "Conducteur" → hook charge les conducteurs depuis `user_roles`
2. Dropdown "Utilisateur" affiche les conducteurs
3. Sélection d'un conducteur → `useModificationsHistory` filtre par `userId`
4. Si rôle "Tous les rôles" → pas de restriction, dropdown = utilisateurs extraits des logs

