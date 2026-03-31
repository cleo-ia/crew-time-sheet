
-- Nettoyage fiche parasite GUNDUZ Erdal - OLYMPIA S13
-- Suppression ciblée par IDs exacts

-- 1. Supprimer les 5 fiches_jours (0h, type_absence NULL)
DELETE FROM fiches_jours WHERE fiche_id = '22d502ce-a472-4eda-be0b-d553221801f9';

-- 2. Supprimer la signature associée
DELETE FROM signatures WHERE fiche_id = '22d502ce-a472-4eda-be0b-d553221801f9';

-- 3. Supprimer la fiche parasite elle-même
DELETE FROM fiches WHERE id = '22d502ce-a472-4eda-be0b-d553221801f9';

-- 4. Supprimer les affectations_jours_chef résiduelles
DELETE FROM affectations_jours_chef 
WHERE macon_id = '2030aa2b-e7ce-48dc-b5cc-5fc68f6bf494' 
  AND chantier_id = '121fe254-c301-40b4-88eb-85c858d4265a' 
  AND semaine = '2026-S13';
