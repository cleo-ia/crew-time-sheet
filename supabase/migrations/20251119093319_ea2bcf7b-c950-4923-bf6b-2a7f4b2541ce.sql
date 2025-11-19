-- Étendre l'enum role_metier_type pour inclure chef et conducteur
ALTER TYPE public.role_metier_type ADD VALUE IF NOT EXISTS 'chef';
ALTER TYPE public.role_metier_type ADD VALUE IF NOT EXISTS 'conducteur';