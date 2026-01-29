-- Supprimer les anciennes policies sur demandes_conges
DROP POLICY IF EXISTS "Users can view demandes in company" ON public.demandes_conges;
DROP POLICY IF EXISTS "Users can create demandes in company" ON public.demandes_conges;
DROP POLICY IF EXISTS "Users can update demandes in company" ON public.demandes_conges;
DROP POLICY IF EXISTS "Admins can delete demandes" ON public.demandes_conges;

-- Recréer avec get_selected_entreprise_id() qui respecte le contexte multi-tenant
CREATE POLICY "Users can view demandes in company"
  ON public.demandes_conges FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin')
    OR entreprise_id = get_selected_entreprise_id()
  );

CREATE POLICY "Users can create demandes in company"
  ON public.demandes_conges FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin')
    OR entreprise_id = get_selected_entreprise_id()
  );

CREATE POLICY "Users can update demandes in company"
  ON public.demandes_conges FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin')
    OR entreprise_id = get_selected_entreprise_id()
  );

CREATE POLICY "Admins can delete demandes"
  ON public.demandes_conges FOR DELETE
  TO authenticated
  USING (
    entreprise_id = get_selected_entreprise_id()
    AND has_role(auth.uid(), 'admin')
  );