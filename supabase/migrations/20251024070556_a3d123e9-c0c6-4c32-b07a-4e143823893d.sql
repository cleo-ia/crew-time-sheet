-- Correction : Redéfinir la colonne total_jour pour exclure les trajets du calcul

-- Étape 1 : Supprimer le trigger existant
DROP TRIGGER IF EXISTS trg_set_total_jour ON public.fiches_jours;

-- Étape 2 : Supprimer la fonction
DROP FUNCTION IF EXISTS public.set_total_jour() CASCADE;

-- Étape 3 : Supprimer la colonne générée existante
ALTER TABLE public.fiches_jours DROP COLUMN IF EXISTS total_jour;

-- Étape 4 : Recréer total_jour comme colonne générée SANS le T
-- Désormais : total_jour = HNORM + HI (les trajets ne comptent plus dans les heures)
ALTER TABLE public.fiches_jours 
ADD COLUMN total_jour numeric 
GENERATED ALWAYS AS (COALESCE("HNORM", 0) + COALESCE("HI", 0)) STORED;

-- Étape 5 : Forcer le recalcul des totaux de toutes les fiches
UPDATE public.fiches
SET total_heures = (
  SELECT COALESCE(SUM(total_jour), 0)
  FROM public.fiches_jours
  WHERE fiche_id = fiches.id
);