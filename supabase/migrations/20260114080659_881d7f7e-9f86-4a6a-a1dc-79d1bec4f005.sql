-- Étape 2 : Mettre à jour la fonction has_role pour que super_admin ait accès à tout
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (ur.role = _role OR ur.role = 'super_admin')
  );
$$;

-- Étape 3 : Mettre à jour ton compte vers super_admin
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = '763f030a-23ae-4355-9a0c-1fc715a9ea70';