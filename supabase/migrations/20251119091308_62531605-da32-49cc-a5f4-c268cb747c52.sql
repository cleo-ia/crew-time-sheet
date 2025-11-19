-- Modifier le trigger handle_new_user_signup pour associer les comptes Auth aux fiches RH existantes
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record record;
  user_email text;
  existing_utilisateur_id uuid;
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

  -- Vérifier si un utilisateur avec cet email existe déjà
  SELECT id INTO existing_utilisateur_id
  FROM public.utilisateurs
  WHERE email = user_email
  LIMIT 1;

  IF existing_utilisateur_id IS NOT NULL THEN
    -- Associer le compte Auth à la fiche RH existante
    UPDATE public.utilisateurs
    SET auth_user_id = NEW.id,
        updated_at = now()
    WHERE id = existing_utilisateur_id;
  ELSE
    -- Créer une nouvelle entrée dans utilisateurs
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
  END IF;

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