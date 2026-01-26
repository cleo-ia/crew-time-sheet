-- Correction des enregistrements où T=1 avec code_trajet GD ou T_PERSO
-- Ces options sont mutuellement exclusives avec le trajet standard

UPDATE fiches_jours 
SET "T" = 0
WHERE "T" = 1 
  AND code_trajet IN ('GD', 'T_PERSO');