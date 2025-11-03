-- Ajouter les colonnes regularisation_m1 et autres_elements à la table fiches_jours
ALTER TABLE public.fiches_jours
ADD COLUMN IF NOT EXISTS regularisation_m1 TEXT,
ADD COLUMN IF NOT EXISTS autres_elements TEXT;

COMMENT ON COLUMN public.fiches_jours.regularisation_m1 IS 'Notes de régularisation du mois précédent (ex: ajustements, corrections)';
COMMENT ON COLUMN public.fiches_jours.autres_elements IS 'Notes diverses pour le service RH (ex: remarques, informations pratiques)';