-- Ajouter les colonnes date_debut et date_fin à la table chantiers
ALTER TABLE public.chantiers 
ADD COLUMN date_debut DATE,
ADD COLUMN date_fin DATE;

-- Ajouter un commentaire pour documenter l'utilisation
COMMENT ON COLUMN public.chantiers.date_debut IS 'Date de début prévue du chantier (pour planning Gantt)';
COMMENT ON COLUMN public.chantiers.date_fin IS 'Date de fin prévue du chantier (pour planning Gantt)';