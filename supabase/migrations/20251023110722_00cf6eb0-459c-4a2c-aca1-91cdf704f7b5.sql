-- Ajout de la colonne trajet_perso dans la table fiches_jours
ALTER TABLE public.fiches_jours
ADD COLUMN trajet_perso boolean DEFAULT false;

-- Commentaire pour documentation
COMMENT ON COLUMN public.fiches_jours.trajet_perso IS 'Indique si le salarié utilise son véhicule personnel pour se rendre au chantier (indemnité différente du trajet collectif)';