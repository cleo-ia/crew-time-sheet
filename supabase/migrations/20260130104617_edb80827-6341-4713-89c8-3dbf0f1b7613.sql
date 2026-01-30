-- Nettoyage du doublon Jorge Martins

-- 1. Supprimer le rôle associé au doublon
DELETE FROM public.user_roles
WHERE user_id = 'fdf8b8bb-9af9-4da6-bd12-aa491b992506';

-- 2. Supprimer le profile doublon
DELETE FROM public.profiles
WHERE id = 'fdf8b8bb-9af9-4da6-bd12-aa491b992506';

-- 3. Supprimer l'entrée utilisateur doublon
DELETE FROM public.utilisateurs
WHERE id = 'fdf8b8bb-9af9-4da6-bd12-aa491b992506';