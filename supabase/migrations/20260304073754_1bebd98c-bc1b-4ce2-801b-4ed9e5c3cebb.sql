DROP POLICY IF EXISTS "Temporary: allow all access to conducteurs_chefs" ON public.conducteurs_chefs;

CREATE POLICY "Users can access conducteurs_chefs of their company"
  ON public.conducteurs_chefs
  FOR ALL
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());