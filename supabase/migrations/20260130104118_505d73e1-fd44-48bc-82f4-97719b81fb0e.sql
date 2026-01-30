-- Mise à jour du trigger handle_new_user_signup pour comparaison d'email case-insensitive
-- Évite la création de doublons lorsque l'email a une casse différente (ex: Jorge.martins vs jorge.martins)

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
  invitation_entreprise_id uuid;
  mapped_role_metier text;
BEGIN
  user_email := NEW.email;

  -- Vérifier le domaine email
  IF user_email !~* '^[a-z0-9._%+-]+@groupe-engo\.com$' THEN
    RAISE EXCEPTION 'Email domain must be @groupe-engo.com';
  END IF;

  -- Chercher une invitation valide (comparaison case-insensitive)
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE LOWER(email) = LOWER(user_email)
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No valid invitation found for email: %', user_email;
  END IF;

  invitation_entreprise_id := invitation_record.entreprise_id;

  -- Mapper le rôle d'invitation vers role_metier (seulement chef et conducteur)
  -- Les autres rôles métiers (macon, finisseur, grutier) sont assignés 
  -- via les fiches RH et non via les invitations
  -- Cast to text to avoid enum conversion errors
  mapped_role_metier := CASE invitation_record.role::text
    WHEN 'chef' THEN 'chef'
    WHEN 'conducteur' THEN 'conducteur'
    ELSE NULL
  END;

  -- Créer le profile avec entreprise_id
  INSERT INTO public.profiles (id, email, first_name, last_name, entreprise_id, created_at, updated_at)
  VALUES (
    NEW.id,
    user_email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    invitation_entreprise_id,
    now(),
    now()
  );

  -- Vérifier si un utilisateur avec cet email existe déjà (comparaison case-insensitive)
  SELECT id INTO existing_utilisateur_id
  FROM public.utilisateurs
  WHERE LOWER(email) = LOWER(user_email)
  LIMIT 1;

  IF existing_utilisateur_id IS NOT NULL THEN
    -- Associer le compte Auth à la fiche RH existante
    UPDATE public.utilisateurs
    SET auth_user_id = NEW.id,
        entreprise_id = invitation_entreprise_id,
        role_metier = COALESCE(role_metier, mapped_role_metier::role_metier_type),
        updated_at = now()
    WHERE id = existing_utilisateur_id;
  ELSE
    -- Créer une nouvelle entrée dans utilisateurs
    INSERT INTO public.utilisateurs (id, auth_user_id, email, prenom, nom, entreprise_id, role_metier, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.id,
      user_email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      invitation_entreprise_id,
      mapped_role_metier::role_metier_type,
      now(),
      now()
    );
  END IF;

  -- Assigner le rôle avec entreprise_id
  INSERT INTO public.user_roles (user_id, role, entreprise_id)
  VALUES (NEW.id, invitation_record.role, invitation_entreprise_id);

  -- Marquer l'invitation comme acceptée
  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE id = invitation_record.id;

  RETURN NEW;
END;
$function$;