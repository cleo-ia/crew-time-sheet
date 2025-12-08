-- Supprimer l'ancienne contrainte qui empêche un même rôle dans plusieurs entreprises
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;