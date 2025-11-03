-- 1. Supprimer la vue me temporairement
DROP VIEW IF EXISTS public.me;

-- 2. Supprimer la fonction has_role avec CASCADE (supprime aussi les policies qui en dépendent)
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;

-- 3. Nettoyer TOUTES les tables avec role
DELETE FROM public.user_roles WHERE role IN ('finisseur', 'interimaire', 'macon');
DELETE FROM public.signatures WHERE role IN ('finisseur', 'interimaire', 'macon');
DELETE FROM public.invitations WHERE role IN ('finisseur', 'interimaire', 'macon');

-- 4. Supprimer le default sur user_roles.role
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;

-- 5. Renommer l'ancien enum
ALTER TYPE public.app_role RENAME TO app_role_old;

-- 6. Créer le nouveau enum (seulement les rôles qui peuvent se connecter)
CREATE TYPE public.app_role AS ENUM ('admin', 'rh', 'conducteur', 'chef');

-- 7. Mettre à jour user_roles
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;

-- 8. Mettre à jour invitations
ALTER TABLE public.invitations
  ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;

-- 9. Mettre à jour signatures  
ALTER TABLE public.signatures
  ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;

-- 10. Supprimer l'ancien type avec CASCADE
DROP TYPE public.app_role_old CASCADE;

-- 11. Recréer la fonction has_role
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
      AND ur.role = _role
  );
$$;

-- 12. Recréer la policy storage pour les admins
CREATE POLICY "Admins have full access to files"
ON storage.objects
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 13. Recréer la vue me avec le nouveau type
CREATE OR REPLACE VIEW public.me AS
SELECT 
  u.id,
  u.prenom,
  u.nom,
  u.email,
  u.auth_user_id,
  u.created_at,
  u.updated_at,
  ur.role
FROM public.utilisateurs u
LEFT JOIN public.user_roles ur ON u.auth_user_id = ur.user_id
WHERE u.auth_user_id = auth.uid();

-- 14. Ajouter des commentaires pour documenter les droits
COMMENT ON TYPE public.app_role IS 'Rôles utilisateurs: admin (full access), rh (all except admin panel), conducteur (validation page only), chef (chef entry page only)';

COMMENT ON TABLE public.user_roles IS 'Assigne un rôle unique à chaque utilisateur. Finisseurs et intérimaires ne sont PAS des utilisateurs et sont gérés via la table utilisateurs.';