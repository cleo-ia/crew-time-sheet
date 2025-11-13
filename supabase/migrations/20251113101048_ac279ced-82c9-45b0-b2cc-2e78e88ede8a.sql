-- Ajouter la colonne commentaire dans fiches_jours
ALTER TABLE public.fiches_jours 
ADD COLUMN commentaire TEXT NULL;

COMMENT ON COLUMN public.fiches_jours.commentaire IS 'Commentaire libre du chef pour signaler des informations spécifiques pour ce jour et cet employé';