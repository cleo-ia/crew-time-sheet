-- Ajouter une colonne pour l'agence d'intérim
ALTER TABLE public.utilisateurs 
ADD COLUMN agence_interim text;

COMMENT ON COLUMN public.utilisateurs.agence_interim IS 'Nom de l''agence d''intérim pour les utilisateurs de type interimaire';