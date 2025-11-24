-- =====================================================
-- Migration: Ajout du flag d'onboarding pour redirection /install
-- =====================================================

-- 1. Ajouter la colonne has_completed_onboarding à user_roles
ALTER TABLE public.user_roles 
ADD COLUMN has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Mettre à jour TOUS les utilisateurs existants pour éviter toute régression
-- Ils ont déjà utilisé l'app, donc considérés comme "onboardés"
UPDATE public.user_roles 
SET has_completed_onboarding = TRUE;

-- 3. Documenter la colonne
COMMENT ON COLUMN public.user_roles.has_completed_onboarding IS 
  'Indique si l''utilisateur a complété son onboarding (visite de /install). FALSE uniquement pour les nouveaux utilisateurs invités.';

-- 4. Créer la politique RLS pour permettre aux users de mettre à jour leur propre flag
CREATE POLICY "users_can_update_own_onboarding"
ON public.user_roles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND
  -- L'utilisateur ne peut pas modifier son rôle, seulement le flag d'onboarding
  role IS NOT DISTINCT FROM (
    SELECT role 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  )
);