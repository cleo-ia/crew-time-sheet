-- 1. Supprimer la table obsolète (vide, aucune dépendance)
DROP TABLE IF EXISTS public.affectations_backup;

-- 2. Renforcer RLS de affectations
DROP POLICY IF EXISTS "Enable all access for development" ON public.affectations;

CREATE POLICY "Users can access affectations of their company"
  ON public.affectations
  FOR ALL
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());