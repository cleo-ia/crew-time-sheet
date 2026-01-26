-- Ajout de la colonne base_horaire pour distinguer contrats 35h/39h
ALTER TABLE public.utilisateurs
ADD COLUMN IF NOT EXISTS base_horaire TEXT;

COMMENT ON COLUMN public.utilisateurs.base_horaire IS 'Base horaire du contrat: 35h ou 39h';