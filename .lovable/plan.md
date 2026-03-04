

## Plan corrigé : Nettoyage sécurité (2 actions sûres)

### Contexte important

La table `affectations` **ne peut pas être supprimée** : elle alimente la vue `affectations_view` qui est utilisée activement dans le frontend (`useFiches.ts`, `useFicheDetailForEdit.ts`) pour afficher les noms/prénoms des maçons sur les fiches.

### Ce qui sera fait

**1. Supprimer la table `affectations_backup`**
- 0 ligne, 0 référence code, 0 vue associée
- Migration SQL : `DROP TABLE IF EXISTS public.affectations_backup;`

**2. Renforcer le RLS de `affectations`** (au lieu de la supprimer)
- Remplacer `USING (true) / WITH CHECK (true)` par `USING (entreprise_id = get_selected_entreprise_id()) / WITH CHECK (entreprise_id = get_selected_entreprise_id())`
- Toutes les lignes existantes ont déjà un `entreprise_id` valide (vérifié précédemment)

### Migration SQL

```sql
-- 1. Supprimer la table obsolète (vide, aucune dépendance)
DROP TABLE IF EXISTS public.affectations_backup;

-- 2. Renforcer RLS de affectations
DROP POLICY IF EXISTS "Enable all access for development" ON public.affectations;

CREATE POLICY "Users can access affectations of their company"
  ON public.affectations
  FOR ALL
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());
```

### Fichiers modifiés

Aucun fichier frontend à modifier. Le renforcement RLS est transparent car le header `x-entreprise-id` est déjà envoyé par le client Supabase.

### Impact utilisateur

Zéro. Les données restent accessibles normalement, mais maintenant isolées par entreprise au niveau base de données.

