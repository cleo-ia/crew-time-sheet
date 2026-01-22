-- Nettoyage des données KASMI : suppression de la fiche fantôme "sans chantier"
-- Cette fiche a été créée par erreur par l'auto-save et cause des doublons d'heures

-- Supprimer les fiches_jours de la fiche fantôme
DELETE FROM fiches_jours 
WHERE fiche_id = '38dde2a7-3d42-4601-af05-7114cf88fd54';

-- Supprimer la fiche fantôme elle-même
DELETE FROM fiches 
WHERE id = '38dde2a7-3d42-4601-af05-7114cf88fd54';