-- Mise à jour de la contrainte de format de semaine pour accepter W ou S

-- 1. Supprimer l'ancienne contrainte qui n'accepte que "W"
ALTER TABLE public.fiches 
DROP CONSTRAINT IF EXISTS fiches_semaine_format;

-- 2. Ajouter la nouvelle contrainte qui accepte "W" ou "S"
ALTER TABLE public.fiches
ADD CONSTRAINT fiches_semaine_format 
CHECK (semaine ~ '^[0-9]{4}-(W|S)[0-9]{2}$');