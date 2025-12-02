-- Ajouter la colonne client à la table chantiers
ALTER TABLE public.chantiers 
ADD COLUMN client TEXT;

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN public.chantiers.client IS 'Nom du client du chantier';