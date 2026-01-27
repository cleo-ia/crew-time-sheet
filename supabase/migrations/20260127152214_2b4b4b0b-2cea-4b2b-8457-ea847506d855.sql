-- 1. Nettoyage des données existantes

-- Chefs avec app_role 'chef' → role_metier = 'chef'
UPDATE public.utilisateurs SET role_metier = 'chef' 
WHERE auth_user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'chef'
) AND role_metier IS NULL;

-- Conducteurs avec app_role 'conducteur' → role_metier = 'conducteur'
UPDATE public.utilisateurs SET role_metier = 'conducteur'
WHERE auth_user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'conducteur'
) AND role_metier IS NULL;

-- Utilisateurs terrain sans email ni auth → finisseurs par défaut
UPDATE public.utilisateurs SET role_metier = 'finisseur'
WHERE role_metier IS NULL 
  AND (agence_interim IS NULL OR agence_interim = '')
  AND email IS NULL
  AND auth_user_id IS NULL;

-- 2. Amélioration du trigger handle_new_user_signup pour définir automatiquement role_metier

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

  -- Récupérer l'entreprise_id de l'invitation
  invitation_entreprise_id := invitation_record.entreprise_id;

  -- NOUVEAU: Mapper le rôle d'invitation vers role_metier (pour les rôles terrain uniquement)
  mapped_role_metier := CASE invitation_record.role
    WHEN 'chef' THEN 'chef'
    WHEN 'conducteur' THEN 'conducteur'
    WHEN 'macon' THEN 'macon'
    WHEN 'finisseur' THEN 'finisseur'
    WHEN 'grutier' THEN 'grutier'
    ELSE NULL  -- admin, rh, gestionnaire, super_admin → pas de role_metier
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

  -- Vérifier si un utilisateur avec cet email existe déjà
  SELECT id INTO existing_utilisateur_id
  FROM public.utilisateurs
  WHERE email = user_email
  LIMIT 1;

  IF existing_utilisateur_id IS NOT NULL THEN
    -- Associer le compte Auth à la fiche RH existante et définir role_metier si absent
    UPDATE public.utilisateurs
    SET auth_user_id = NEW.id,
        entreprise_id = invitation_entreprise_id,
        role_metier = COALESCE(role_metier, mapped_role_metier),
        updated_at = now()
    WHERE id = existing_utilisateur_id;
  ELSE
    -- Créer une nouvelle entrée dans utilisateurs avec entreprise_id et role_metier
    INSERT INTO public.utilisateurs (id, auth_user_id, email, prenom, nom, entreprise_id, role_metier, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.id,
      user_email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      invitation_entreprise_id,
      mapped_role_metier,
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