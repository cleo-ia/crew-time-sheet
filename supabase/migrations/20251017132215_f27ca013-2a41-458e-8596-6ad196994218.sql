-- Fix incorrect foreign key on public.user_roles.user_id
-- It incorrectly referenced public.utilisateurs(id), which caused 500 errors on invite
-- when the signup trigger inserts into user_roles with auth.users.new.id.

-- 1) Drop the wrong FK
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- 2) Remap existing rows from utilisateurs.id -> utilisateurs.auth_user_id when possible
UPDATE public.user_roles ur
SET user_id = u.auth_user_id
FROM public.utilisateurs u
WHERE ur.user_id = u.id
  AND u.auth_user_id IS NOT NULL;

-- 3) Recreate FK to auth.users(id). Use NOT VALID to avoid blocking on legacy rows.
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

-- Note: We intentionally do not VALIDATE CONSTRAINT here, so legacy rows without
-- a corresponding auth user do not block invites. New/updated rows will be checked.