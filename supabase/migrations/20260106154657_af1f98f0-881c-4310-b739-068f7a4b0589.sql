-- Annuler la clôture de décembre 2025

-- 1. Supprimer l'entrée de clôture
DELETE FROM periodes_cloturees 
WHERE id = '45b7da3f-04ba-4c99-8518-faff676af5ee';

-- 2. Remettre les 120 fiches en statut ENVOYE_RH
UPDATE fiches 
SET statut = 'ENVOYE_RH', updated_at = NOW()
WHERE statut = 'CLOTURE' 
AND semaine IN ('2025-S49', '2025-S50', '2025-S51', '2025-S52');