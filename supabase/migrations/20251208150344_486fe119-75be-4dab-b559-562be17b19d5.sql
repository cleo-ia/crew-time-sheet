-- Nettoyage: Supprimer la fiche d'Émile Gauthier pour Tom Genin S51
-- Étape 1: Supprimer les fiches_jours associées
DELETE FROM fiches_jours 
WHERE fiche_id = '483b4be0-599e-4ce6-8334-52f27ff3351a';

-- Étape 2: Supprimer la fiche
DELETE FROM fiches 
WHERE id = '483b4be0-599e-4ce6-8334-52f27ff3351a';