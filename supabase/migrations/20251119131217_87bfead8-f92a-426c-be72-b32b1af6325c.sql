-- Ajouter 5 nouvelles colonnes texte à la table fiches pour les overrides d'export RH
ALTER TABLE public.fiches
  ADD COLUMN total_saisie text DEFAULT NULL,
  ADD COLUMN saisie_du_mois text DEFAULT NULL,
  ADD COLUMN commentaire_saisie text DEFAULT NULL,
  ADD COLUMN regularisation_m1_export text DEFAULT NULL,
  ADD COLUMN autres_elements_export text DEFAULT NULL;

COMMENT ON COLUMN public.fiches.total_saisie IS 'Total saisie (pré-export RH)';
COMMENT ON COLUMN public.fiches.saisie_du_mois IS 'Saisie du mois (pré-export RH)';
COMMENT ON COLUMN public.fiches.commentaire_saisie IS 'Commentaires saisie (pré-export RH)';
COMMENT ON COLUMN public.fiches.regularisation_m1_export IS 'Régularisation M-1 consolidée pour export';
COMMENT ON COLUMN public.fiches.autres_elements_export IS 'Autres éléments consolidés pour export';