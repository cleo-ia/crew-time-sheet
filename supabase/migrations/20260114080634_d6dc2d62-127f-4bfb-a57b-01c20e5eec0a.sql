-- Étape 1 : Ajouter le rôle super_admin à l'enum app_role
ALTER TYPE app_role ADD VALUE 'super_admin' BEFORE 'admin';