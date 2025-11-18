-- Créer la nouvelle table vehicules
CREATE TABLE IF NOT EXISTS public.vehicules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  immatriculation text NOT NULL,
  marque text,
  modele text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;

-- Créer la politique RLS (même que les anciennes tables)
CREATE POLICY "Temporary: allow all access to vehicules"
ON public.vehicules
FOR ALL
USING (true)
WITH CHECK (true);

-- Migrer les données de vehicules_chefs_macons
INSERT INTO public.vehicules (id, immatriculation, marque, modele, actif, created_at, updated_at)
SELECT id, immatriculation, marque, modele, actif, created_at, updated_at
FROM public.vehicules_chefs_macons;

-- Migrer les données de vehicules_finisseurs
INSERT INTO public.vehicules (id, immatriculation, marque, modele, actif, created_at, updated_at)
SELECT id, immatriculation, marque, modele, actif, created_at, updated_at
FROM public.vehicules_finisseurs;

-- Créer le trigger pour updated_at
CREATE TRIGGER update_vehicules_updated_at
BEFORE UPDATE ON public.vehicules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Supprimer les anciennes tables
DROP TABLE IF EXISTS public.vehicules_chefs_macons CASCADE;
DROP TABLE IF EXISTS public.vehicules_finisseurs CASCADE;