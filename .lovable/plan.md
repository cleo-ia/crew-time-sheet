

## Plan : Renforcer le RLS de `conducteurs_chefs` (Point 2)

### Vérifications effectuées

- **Frontend** : 1 seul fichier utilise cette table (`ChantierSelector.tsx`), via un SELECT filtré par `conducteur_id`. Le header `x-entreprise-id` est déjà envoyé par le client Supabase, donc le nouveau RLS filtrera correctement sans aucun changement de code.
- **Backend (Edge Functions)** : 0 référence à `conducteurs_chefs` dans aucune Edge Function.
- **Données existantes** : 1 seule ligne, avec un `entreprise_id` valide (`edd12053-55dc-4f4b-b2ad-5048cb5aa798`).
- **Trigger** : `tr_conducteurs_chefs_set_entreprise` auto-populate `entreprise_id` sur INSERT — continue de fonctionner normalement.

### Migration SQL

```sql
DROP POLICY IF EXISTS "Temporary: allow all access to conducteurs_chefs" ON public.conducteurs_chefs;

CREATE POLICY "Users can access conducteurs_chefs of their company"
  ON public.conducteurs_chefs
  FOR ALL
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());
```

### Fichiers modifiés

Aucun fichier frontend ni backend. Le changement est purement au niveau base de données.

### Résultat attendu

Les 5 warnings du linter Supabase sur `conducteurs_chefs` disparaîtront. L'isolation multi-tenant sera garantie au niveau DB.

