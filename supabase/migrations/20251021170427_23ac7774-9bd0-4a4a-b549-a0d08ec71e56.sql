-- Create ENUM for role_metier
CREATE TYPE public.role_metier_type AS ENUM ('macon', 'finisseur');

-- Add role_metier column to utilisateurs
ALTER TABLE public.utilisateurs 
ADD COLUMN role_metier public.role_metier_type NULL;

-- Migrate existing data: set 'macon' for users without agence_interim and without auth_user_id
UPDATE public.utilisateurs
SET role_metier = 'macon'
WHERE agence_interim IS NULL
  AND (auth_user_id IS NULL OR auth_user_id NOT IN (SELECT user_id FROM user_roles));

-- Add comment for documentation
COMMENT ON COLUMN public.utilisateurs.role_metier IS 
'Rôle métier pour les salariés non-authentifiés (macon ou finisseur)';