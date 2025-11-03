-- 1. Mettre à jour la fonction handle_new_user_signup() pour créer aussi une entrée dans utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record record;
  user_email text;
BEGIN
  user_email := NEW.email;

  -- Vérifier le domaine email
  IF user_email !~* '^[a-z0-9._%+-]+@groupe-engo\.com$' THEN
    RAISE EXCEPTION 'Email domain must be @groupe-engo.com';
  END IF;

  -- Chercher une invitation valide
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE email = user_email
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No valid invitation found for email: %', user_email;
  END IF;

  -- Créer le profile
  INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
  VALUES (
    NEW.id,
    user_email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    now(),
    now()
  );

  -- Créer aussi l'entrée dans utilisateurs
  INSERT INTO public.utilisateurs (id, auth_user_id, email, prenom, nom, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.id,
    user_email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    now(),
    now()
  );

  -- Assigner le rôle
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, invitation_record.role);

  -- Marquer l'invitation comme acceptée
  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE id = invitation_record.id;

  RETURN NEW;
END;
$function$;

-- 2. Migrer les utilisateurs existants (Tom et Theo) de profiles vers utilisateurs
INSERT INTO public.utilisateurs (id, auth_user_id, email, prenom, nom, created_at, updated_at)
SELECT 
  p.id,
  p.id as auth_user_id,
  p.email,
  p.first_name as prenom,
  p.last_name as nom,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE p.id NOT IN (SELECT id FROM public.utilisateurs WHERE auth_user_id IS NOT NULL)
ON CONFLICT (id) DO NOTHING;