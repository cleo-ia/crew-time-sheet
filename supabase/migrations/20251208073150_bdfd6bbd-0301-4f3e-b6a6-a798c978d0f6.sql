-- 1. Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Users see only their company roles" ON public.user_roles;

-- 2. Créer une nouvelle politique qui autorise un utilisateur à voir TOUS ses rôles
CREATE POLICY "Users can see their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());