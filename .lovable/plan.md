
# Plan de correction : Erreur d'invitation "invalid input value for enum app_role"

## Diagnostic

L'erreur provient du trigger `handle_new_user_signup` qui s'exécute lors de la création d'un utilisateur dans `auth.users`. Ce trigger contient un bloc CASE qui compare `invitation_record.role` (de type `app_role`) avec des valeurs de chaîne incluant `'macon'`, `'finisseur'`, et `'grutier'`.

Le problème : PostgreSQL essaie de convertir ces chaînes en type `app_role` pour effectuer la comparaison, mais ces valeurs n'existent pas dans l'enum `app_role` (qui contient : super_admin, admin, rh, conducteur, chef, gestionnaire).

## Solution proposée

Modifier le trigger `handle_new_user_signup` pour supprimer les comparaisons avec des rôles qui n'existent pas dans `app_role`. Ces rôles (macon, finisseur, grutier) ne sont jamais utilisés pour les invitations car l'edge function `invite-user` n'accepte que : admin, rh, conducteur, chef.

### Changement dans la fonction

```sql
-- AVANT (problématique)
mapped_role_metier := CASE invitation_record.role
  WHEN 'chef' THEN 'chef'
  WHEN 'conducteur' THEN 'conducteur'
  WHEN 'macon' THEN 'macon'         -- Erreur ici
  WHEN 'finisseur' THEN 'finisseur' -- Erreur ici  
  WHEN 'grutier' THEN 'grutier'     -- Erreur ici
  ELSE NULL
END;

-- APRES (corrigé)
mapped_role_metier := CASE invitation_record.role::text
  WHEN 'chef' THEN 'chef'
  WHEN 'conducteur' THEN 'conducteur'
  ELSE NULL
END;
```

La solution caste `invitation_record.role` en TEXT avant la comparaison, ce qui évite le problème de conversion d'enum.

---

## Détails techniques

### Étape 1 : Migration SQL

Créer une migration pour mettre à jour la fonction `handle_new_user_signup` :

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  invitation_entreprise_id := invitation_record.entreprise_id;

  -- Mapper le rôle d'invitation vers role_metier (seulement chef et conducteur)
  -- Les autres rôles métiers (macon, finisseur, grutier) sont assignés 
  -- via les fiches RH et non via les invitations
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

  -- Vérifier si un utilisateur avec cet email existe déjà
  SELECT id INTO existing_utilisateur_id
  FROM public.utilisateurs
  WHERE email = user_email
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
$$;
```

### Étape 2 : Validation

Une fois la migration appliquée :
1. Tester l'invitation d'un chef SDER (philippe.fay@groupe-engo.com)
2. Vérifier que l'email d'invitation est bien envoyé
3. Vérifier les logs pour confirmer l'absence d'erreur

---

## Impact

- Aucun changement dans le comportement fonctionnel
- Les invitations pour les rôles admin, rh, conducteur, chef fonctionneront correctement
- Les rôles métiers (macon, finisseur, grutier) continueront à être gérés via les fiches RH, pas via les invitations
