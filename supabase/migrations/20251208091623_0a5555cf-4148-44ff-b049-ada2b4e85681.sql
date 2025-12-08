-- Créer la fonction pour vérifier l'accès à une entreprise spécifique
CREATE OR REPLACE FUNCTION public.user_has_access_to_entreprise(_entreprise_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND entreprise_id = _entreprise_id
  )
$$;

-- Mettre à jour la politique RLS sur utilisateurs
DROP POLICY IF EXISTS "Users see only their company employees" ON public.utilisateurs;

CREATE POLICY "Users can access employees of their companies" 
ON public.utilisateurs
FOR ALL
USING (public.user_has_access_to_entreprise(entreprise_id))
WITH CHECK (public.user_has_access_to_entreprise(entreprise_id));

-- Mettre à jour la politique RLS sur chantiers
DROP POLICY IF EXISTS "Users see only their company chantiers" ON public.chantiers;

CREATE POLICY "Users can access chantiers of their companies" 
ON public.chantiers
FOR ALL
USING (public.user_has_access_to_entreprise(entreprise_id))
WITH CHECK (public.user_has_access_to_entreprise(entreprise_id));

-- Mettre à jour la politique RLS sur vehicules
DROP POLICY IF EXISTS "Users see only their company vehicules" ON public.vehicules;

CREATE POLICY "Users can access vehicules of their companies" 
ON public.vehicules
FOR ALL
USING (public.user_has_access_to_entreprise(entreprise_id))
WITH CHECK (public.user_has_access_to_entreprise(entreprise_id));

-- Mettre à jour la politique RLS sur invitations
DROP POLICY IF EXISTS "Users see only their company invitations" ON public.invitations;

CREATE POLICY "Users can access invitations of their companies" 
ON public.invitations
FOR ALL
USING (public.user_has_access_to_entreprise(entreprise_id))
WITH CHECK (public.user_has_access_to_entreprise(entreprise_id));

-- Mettre à jour la politique RLS sur profiles
DROP POLICY IF EXISTS "Users see only their company profiles" ON public.profiles;

CREATE POLICY "Users can access profiles of their companies" 
ON public.profiles
FOR ALL
USING ((entreprise_id IS NULL) OR public.user_has_access_to_entreprise(entreprise_id))
WITH CHECK ((entreprise_id IS NULL) OR public.user_has_access_to_entreprise(entreprise_id));

-- Mettre à jour la politique RLS sur periodes_cloturees
DROP POLICY IF EXISTS "Users see only their company periodes" ON public.periodes_cloturees;

CREATE POLICY "Users can access periodes of their companies" 
ON public.periodes_cloturees
FOR ALL
USING ((entreprise_id IS NULL) OR public.user_has_access_to_entreprise(entreprise_id))
WITH CHECK ((entreprise_id IS NULL) OR public.user_has_access_to_entreprise(entreprise_id));