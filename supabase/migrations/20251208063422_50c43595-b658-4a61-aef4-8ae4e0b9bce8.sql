-- =====================================================
-- MIGRATION MULTI-TENANT: Création table entreprises et isolation des données
-- =====================================================

-- 1. Créer la table entreprises
CREATE TABLE public.entreprises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  couleur_primaire text DEFAULT '#ea580c',
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Insérer les 3 entreprises
INSERT INTO public.entreprises (nom, slug) VALUES 
  ('Limoge Revillon', 'limoge-revillon'),
  ('Engo Bourgogne', 'engo-bourgogne'),
  ('SDER', 'sder');

-- 3. Activer RLS sur entreprises
ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON public.entreprises
  FOR SELECT TO authenticated USING (true);

-- 4. Ajouter entreprise_id aux 7 tables principales (nullable d'abord)
ALTER TABLE public.utilisateurs ADD COLUMN entreprise_id uuid REFERENCES public.entreprises(id);
ALTER TABLE public.user_roles ADD COLUMN entreprise_id uuid REFERENCES public.entreprises(id);
ALTER TABLE public.profiles ADD COLUMN entreprise_id uuid REFERENCES public.entreprises(id);
ALTER TABLE public.chantiers ADD COLUMN entreprise_id uuid REFERENCES public.entreprises(id);
ALTER TABLE public.vehicules ADD COLUMN entreprise_id uuid REFERENCES public.entreprises(id);
ALTER TABLE public.invitations ADD COLUMN entreprise_id uuid REFERENCES public.entreprises(id);
ALTER TABLE public.periodes_cloturees ADD COLUMN entreprise_id uuid REFERENCES public.entreprises(id);

-- 5. Migrer TOUTES les données existantes vers Limoge Revillon
DO $$
DECLARE
  lr_id uuid;
BEGIN
  SELECT id INTO lr_id FROM public.entreprises WHERE slug = 'limoge-revillon';
  
  UPDATE public.utilisateurs SET entreprise_id = lr_id WHERE entreprise_id IS NULL;
  UPDATE public.user_roles SET entreprise_id = lr_id WHERE entreprise_id IS NULL;
  UPDATE public.profiles SET entreprise_id = lr_id WHERE entreprise_id IS NULL;
  UPDATE public.chantiers SET entreprise_id = lr_id WHERE entreprise_id IS NULL;
  UPDATE public.vehicules SET entreprise_id = lr_id WHERE entreprise_id IS NULL;
  UPDATE public.invitations SET entreprise_id = lr_id WHERE entreprise_id IS NULL;
  UPDATE public.periodes_cloturees SET entreprise_id = lr_id WHERE entreprise_id IS NULL;
END $$;

-- 6. Rendre entreprise_id NOT NULL sur les tables critiques
ALTER TABLE public.utilisateurs ALTER COLUMN entreprise_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN entreprise_id SET NOT NULL;
ALTER TABLE public.chantiers ALTER COLUMN entreprise_id SET NOT NULL;
ALTER TABLE public.vehicules ALTER COLUMN entreprise_id SET NOT NULL;
ALTER TABLE public.invitations ALTER COLUMN entreprise_id SET NOT NULL;

-- 7. Créer la fonction helper pour récupérer entreprise_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_user_entreprise_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT entreprise_id 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1
$$;

-- 8. Mettre à jour les RLS policies pour filtrer par entreprise

-- UTILISATEURS
DROP POLICY IF EXISTS "Temporary: allow all access to utilisateurs" ON public.utilisateurs;
CREATE POLICY "Users see only their company employees" ON public.utilisateurs
  FOR ALL TO authenticated
  USING (entreprise_id = public.get_user_entreprise_id())
  WITH CHECK (entreprise_id = public.get_user_entreprise_id());

-- USER_ROLES
DROP POLICY IF EXISTS "Temporary: allow all access to user_roles" ON public.user_roles;
CREATE POLICY "Users see only their company roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (entreprise_id = public.get_user_entreprise_id());

CREATE POLICY "Users can insert for their company" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (entreprise_id = public.get_user_entreprise_id());

-- Note: la policy users_can_update_own_onboarding existe déjà pour UPDATE

-- PROFILES
DROP POLICY IF EXISTS "Temporary: allow all access to profiles" ON public.profiles;
CREATE POLICY "Users see only their company profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (entreprise_id IS NULL OR entreprise_id = public.get_user_entreprise_id())
  WITH CHECK (entreprise_id IS NULL OR entreprise_id = public.get_user_entreprise_id());

-- CHANTIERS
DROP POLICY IF EXISTS "Temporary: allow all access to chantiers" ON public.chantiers;
CREATE POLICY "Users see only their company chantiers" ON public.chantiers
  FOR ALL TO authenticated
  USING (entreprise_id = public.get_user_entreprise_id())
  WITH CHECK (entreprise_id = public.get_user_entreprise_id());

-- VEHICULES
DROP POLICY IF EXISTS "Temporary: allow all access to vehicules" ON public.vehicules;
CREATE POLICY "Users see only their company vehicules" ON public.vehicules
  FOR ALL TO authenticated
  USING (entreprise_id = public.get_user_entreprise_id())
  WITH CHECK (entreprise_id = public.get_user_entreprise_id());

-- INVITATIONS
DROP POLICY IF EXISTS "Temporary: allow all access to invitations" ON public.invitations;
CREATE POLICY "Users see only their company invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (entreprise_id = public.get_user_entreprise_id())
  WITH CHECK (entreprise_id = public.get_user_entreprise_id());

-- PERIODES_CLOTUREES
DROP POLICY IF EXISTS "Enable all access for development" ON public.periodes_cloturees;
CREATE POLICY "Users see only their company periodes" ON public.periodes_cloturees
  FOR ALL TO authenticated
  USING (entreprise_id IS NULL OR entreprise_id = public.get_user_entreprise_id())
  WITH CHECK (entreprise_id IS NULL OR entreprise_id = public.get_user_entreprise_id());

-- 9. Mettre à jour le trigger handle_new_user_signup pour propager entreprise_id
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record record;
  user_email text;
  existing_utilisateur_id uuid;
  invitation_entreprise_id uuid;
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
        updated_at = now()
    WHERE id = existing_utilisateur_id;
  ELSE
    -- Créer une nouvelle entrée dans utilisateurs avec entreprise_id
    INSERT INTO public.utilisateurs (id, auth_user_id, email, prenom, nom, entreprise_id, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.id,
      user_email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      invitation_entreprise_id,
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

-- 10. Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_utilisateurs_entreprise ON public.utilisateurs(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_entreprise ON public.user_roles(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_entreprise ON public.chantiers(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_vehicules_entreprise ON public.vehicules(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_invitations_entreprise ON public.invitations(entreprise_id);