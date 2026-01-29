-- Supprimer les anciennes policies avec bypass super_admin
DROP POLICY IF EXISTS "Users can view demandes in company" ON public.demandes_conges;
DROP POLICY IF EXISTS "Users can create demandes in company" ON public.demandes_conges;
DROP POLICY IF EXISTS "Users can update demandes in company" ON public.demandes_conges;
DROP POLICY IF EXISTS "Admins can delete demandes" ON public.demandes_conges;

-- Recréer SANS bypass super_admin - isolation stricte par entreprise sélectionnée
CREATE POLICY "Users can view demandes in company"
  ON public.demandes_conges FOR SELECT
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id());

CREATE POLICY "Users can create demandes in company"
  ON public.demandes_conges FOR INSERT
  TO authenticated
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

CREATE POLICY "Users can update demandes in company"
  ON public.demandes_conges FOR UPDATE
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id());

CREATE POLICY "Admins can delete demandes"
  ON public.demandes_conges FOR DELETE
  TO authenticated
  USING (
    entreprise_id = get_selected_entreprise_id()
    AND has_role(auth.uid(), 'admin')
  );