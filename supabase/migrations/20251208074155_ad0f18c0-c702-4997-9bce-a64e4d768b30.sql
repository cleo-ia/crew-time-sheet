-- 1. Supprimer l'ancienne politique UPDATE défaillante
DROP POLICY IF EXISTS "users_can_update_own_onboarding" ON public.user_roles;

-- 2. Créer une nouvelle politique UPDATE simple et fonctionnelle
CREATE POLICY "Users can update their own onboarding status"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Marquer l'onboarding comme complété pour l'utilisateur multi-entreprise
UPDATE public.user_roles 
SET has_completed_onboarding = true 
WHERE user_id = '763f030a-23ae-4355-9a0c-1fc715a9ea70';