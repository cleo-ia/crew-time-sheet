-- Phase 1: Fondations - Tables et Triggers pour système d'invitation (CORRIGÉ)

-- 1. Créer la table invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email ~* '^[a-z0-9._%+-]+@groupe-engo\.com$'),
  role app_role NOT NULL,
  conducteur_id uuid REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Créer la table profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Migrer les données de utilisateurs vers profiles (UNIQUEMENT si auth_user_id existe dans auth.users)
INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
SELECT 
  u.auth_user_id,
  u.email,
  u.prenom,
  u.nom,
  u.created_at,
  u.updated_at
FROM public.utilisateurs u
INNER JOIN auth.users au ON au.id = u.auth_user_id
WHERE u.auth_user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 4. Synchroniser user_roles pour tous les profiles existants
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'finisseur'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Créer la table conducteurs_chefs (many-to-many)
CREATE TABLE IF NOT EXISTS public.conducteurs_chefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conducteur_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chef_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conducteur_id, chef_id)
);

-- 6. Créer index pour performances
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_conducteurs_chefs_conducteur ON public.conducteurs_chefs(conducteur_id);
CREATE INDEX IF NOT EXISTS idx_conducteurs_chefs_chef ON public.conducteurs_chefs(chef_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 7. Fonction pour updated_at (ne recrée pas si existe déjà)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 8. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.invitations;
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Fonction pour expirer les invitations (bonus CRON)
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE public.invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Trigger de signup automatique
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record record;
  user_email text;
BEGIN
  -- Récupérer l'email de l'utilisateur
  user_email := NEW.email;

  -- 1. Vérifier le domaine email
  IF user_email !~* '^[a-z0-9._%+-]+@groupe-engo\.com$' THEN
    RAISE EXCEPTION 'Email domain must be @groupe-engo.com';
  END IF;

  -- 2. Chercher une invitation valide
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE email = user_email
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  -- 3. Si pas d'invitation valide, bloquer
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No valid invitation found for email: %', user_email;
  END IF;

  -- 4. Créer le profile
  INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
  VALUES (
    NEW.id,
    user_email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    now(),
    now()
  );

  -- 5. Assigner le rôle
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, invitation_record.role);

  -- 6. Marquer l'invitation comme acceptée
  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE id = invitation_record.id;

  RETURN NEW;
END;
$$;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Créer le trigger sur auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();

-- 11. Activer RLS sur les nouvelles tables (policies permissives temporaires)
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conducteurs_chefs ENABLE ROW LEVEL SECURITY;

-- Policies temporaires permissives (à durcir en Phase 3)
DROP POLICY IF EXISTS "Temporary: allow all access to invitations" ON public.invitations;
CREATE POLICY "Temporary: allow all access to invitations"
  ON public.invitations
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Temporary: allow all access to profiles" ON public.profiles;
CREATE POLICY "Temporary: allow all access to profiles"
  ON public.profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Temporary: allow all access to conducteurs_chefs" ON public.conducteurs_chefs;
CREATE POLICY "Temporary: allow all access to conducteurs_chefs"
  ON public.conducteurs_chefs
  FOR ALL
  USING (true)
  WITH CHECK (true);