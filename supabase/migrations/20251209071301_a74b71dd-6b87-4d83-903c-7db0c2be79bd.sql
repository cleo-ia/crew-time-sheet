-- Étape 1: Corriger la policy RLS sur user_roles
-- Permettre aux admins de voir les rôles de leur entreprise
DROP POLICY IF EXISTS "Users can see their own roles" ON public.user_roles;

CREATE POLICY "Users can see roles in their company"
ON public.user_roles FOR SELECT
USING (
  user_id = auth.uid() 
  OR user_has_access_to_entreprise(entreprise_id)
);

-- Étape 2: Supprimer le doublon ANCIEN dans user_roles (garder le nouveau du 09/12)
DELETE FROM public.user_roles 
WHERE id = 'ce8b7167-213b-4b7d-877f-d8ee16f42cc5';

-- Étape 3: Définir role_metier = 'chef' pour Jérôme DEPART
UPDATE public.utilisateurs 
SET role_metier = 'chef' 
WHERE id = '64b217a4-23d8-46ce-a2ba-d916f03756bb';