-- Mettre à jour la politique RLS sur user_roles (INSERT)
DROP POLICY IF EXISTS "Users can insert for their company" ON public.user_roles;

CREATE POLICY "Users can insert for their companies"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_access_to_entreprise(entreprise_id));