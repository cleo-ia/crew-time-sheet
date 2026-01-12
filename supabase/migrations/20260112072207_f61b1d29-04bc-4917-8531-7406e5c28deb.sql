-- Fonction SECURITY DEFINER pour exposer last_sign_in_at depuis auth.users
CREATE OR REPLACE FUNCTION public.get_users_with_last_signin(p_entreprise_id uuid)
RETURNS TABLE (
  id uuid,
  auth_user_id uuid,
  email text,
  prenom text,
  nom text,
  last_sign_in_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id,
    u.auth_user_id,
    u.email,
    u.prenom,
    u.nom,
    au.last_sign_in_at
  FROM public.utilisateurs u
  LEFT JOIN auth.users au ON u.auth_user_id = au.id
  WHERE u.entreprise_id = p_entreprise_id
    AND u.auth_user_id IS NOT NULL
    AND user_has_access_to_entreprise(p_entreprise_id)
$$;