-- Désactiver RLS sur toutes les tables
ALTER TABLE public.chantiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.affectations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiches_jours DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilisateurs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les policies de chantiers
DROP POLICY IF EXISTS "chantiers_select_creator_or_admin" ON public.chantiers;
DROP POLICY IF EXISTS "chantiers_insert_self_or_admin" ON public.chantiers;
DROP POLICY IF EXISTS "chantiers_update_creator_or_admin" ON public.chantiers;
DROP POLICY IF EXISTS "chantiers_delete_creator_or_admin" ON public.chantiers;

-- Supprimer toutes les policies d'affectations
DROP POLICY IF EXISTS "affectations_select_all" ON public.affectations;
DROP POLICY IF EXISTS "affectations_insert_admin" ON public.affectations;
DROP POLICY IF EXISTS "affectations_update_admin" ON public.affectations;
DROP POLICY IF EXISTS "affectations_delete_admin" ON public.affectations;

-- Supprimer toutes les policies de fiches
DROP POLICY IF EXISTS "fiches_select_owner_or_admin" ON public.fiches;
DROP POLICY IF EXISTS "fiches_insert_owner_or_admin" ON public.fiches;
DROP POLICY IF EXISTS "fiches_update_owner_or_admin" ON public.fiches;
DROP POLICY IF EXISTS "fiches_delete_owner_or_admin" ON public.fiches;

-- Supprimer toutes les policies de fiches_jours
DROP POLICY IF EXISTS "fiches_jours_select_owner_or_admin" ON public.fiches_jours;
DROP POLICY IF EXISTS "fiches_jours_write_owner_or_admin" ON public.fiches_jours;

-- Supprimer toutes les policies de signatures
DROP POLICY IF EXISTS "signatures_select_owner_or_admin" ON public.signatures;
DROP POLICY IF EXISTS "signatures_insert_admin_only" ON public.signatures;
DROP POLICY IF EXISTS "signatures_update_admin_only" ON public.signatures;
DROP POLICY IF EXISTS "signatures_delete_admin_only" ON public.signatures;

-- Supprimer toutes les policies d'utilisateurs
DROP POLICY IF EXISTS "utilisateurs_select_self_or_admin" ON public.utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_insert_self_or_admin" ON public.utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_update_self_or_admin" ON public.utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_delete_self_or_admin" ON public.utilisateurs;

-- Supprimer toutes les policies de user_roles
DROP POLICY IF EXISTS "user_roles_select_self_or_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin_only" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin_only" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin_only" ON public.user_roles;