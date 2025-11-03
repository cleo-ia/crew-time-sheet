-- Temporarily drop strict check constraints on fiches_jours for testing
ALTER TABLE public.fiches_jours
  DROP CONSTRAINT IF EXISTS saisie_obligatoire;

ALTER TABLE public.fiches_jours
  DROP CONSTRAINT IF EXISTS heures_par_jour_max;