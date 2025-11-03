-- Correction finale : total_jour = HNORM uniquement (exclu HI et T)

-- Étape 1 : Supprimer la colonne générée existante
ALTER TABLE public.fiches_jours DROP COLUMN IF EXISTS total_jour;

-- Étape 2 : Recréer total_jour = HNORM uniquement
ALTER TABLE public.fiches_jours 
ADD COLUMN total_jour numeric 
GENERATED ALWAYS AS (COALESCE("HNORM", 0)) STORED;

-- Étape 3 : Recalculer tous les totaux des fiches
UPDATE public.fiches
SET total_heures = (
  SELECT COALESCE(SUM(total_jour), 0)
  FROM public.fiches_jours
  WHERE fiche_id = fiches.id
);