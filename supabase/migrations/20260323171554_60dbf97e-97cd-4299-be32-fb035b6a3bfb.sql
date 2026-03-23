ALTER TABLE public.fiches_jours
ADD CONSTRAINT fiches_jours_fiche_id_date_unique UNIQUE (fiche_id, date);