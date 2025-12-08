-- Supprimer l'ancienne contrainte
ALTER TABLE fiches_jours DROP CONSTRAINT IF EXISTS chk_code_trajet_valid;

-- Recréer avec A_COMPLETER ajouté
ALTER TABLE fiches_jours ADD CONSTRAINT chk_code_trajet_valid 
CHECK (
  code_trajet IS NULL 
  OR code_trajet = ANY (ARRAY[
    'A_COMPLETER',
    'T_PERSO', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 
    'T10', 'T11', 'T12', 'T13', 'T14', 'T15', 'T16', 'T17', 
    'T31', 'T35', 'GD'
  ])
);