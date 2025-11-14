-- ===================================================================
-- MIGRATION : Ajout de code_trajet pour remplacer T (numeric)
-- ===================================================================
-- Objectif : Passer d'un système binaire T (0/1) à des codes précis
-- (T_PERSO, T1-T17, T31, T35, GD) pour l'export Excel automatique
-- ===================================================================

-- 1. Ajouter la nouvelle colonne code_trajet
ALTER TABLE public.fiches_jours 
ADD COLUMN code_trajet TEXT NULL;

-- 2. Créer un index pour optimiser les agrégations RH
CREATE INDEX idx_fiches_jours_code_trajet 
ON public.fiches_jours(code_trajet) 
WHERE code_trajet IS NOT NULL;

-- 3. Ajouter une contrainte CHECK pour valider les valeurs
ALTER TABLE public.fiches_jours
ADD CONSTRAINT chk_code_trajet_valid 
CHECK (
  code_trajet IS NULL OR 
  code_trajet IN (
    'T_PERSO', 
    'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 
    'T10', 'T11', 'T12', 'T13', 'T14', 'T15', 'T16', 'T17',
    'T31', 'T35', 
    'GD'
  )
);

-- 4. Ajouter un commentaire pour la documentation
COMMENT ON COLUMN public.fiches_jours.code_trajet IS 
'Code trajet spécifique: T_PERSO (voiture perso), T1-T17 (trajets standards), T31/T35 (trajets spéciaux), GD (grand déplacement). Remplace progressivement T (numeric) pour permettre un export Excel détaillé.';