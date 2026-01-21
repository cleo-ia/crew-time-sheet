-- Phase 2 : Heures hebdomadaires prévues par chantier
ALTER TABLE public.chantiers 
ADD COLUMN IF NOT EXISTS heures_hebdo_prevues TEXT DEFAULT '39H';

COMMENT ON COLUMN public.chantiers.heures_hebdo_prevues IS 
'Heures hebdomadaires prévues pour le chantier (ex: 35H, 37H, 39H)';

-- Phase 3 : Statut d'insertion chantier
ALTER TABLE public.chantiers 
ADD COLUMN IF NOT EXISTS statut_insertion TEXT DEFAULT NULL;

ALTER TABLE public.chantiers 
ADD COLUMN IF NOT EXISTS insertion_heures_requises INTEGER DEFAULT NULL;

ALTER TABLE public.chantiers 
ADD COLUMN IF NOT EXISTS insertion_date_debut DATE DEFAULT NULL;

COMMENT ON COLUMN public.chantiers.statut_insertion IS 
'Statut clause insertion: ok, en_cours, terminee, annulee, pas_insertion';

COMMENT ON COLUMN public.chantiers.insertion_heures_requises IS 
'Nombre d''heures requises pour la clause d''insertion';

COMMENT ON COLUMN public.chantiers.insertion_date_debut IS 
'Date de début de la clause d''insertion';