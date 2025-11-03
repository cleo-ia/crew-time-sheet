-- Suppression de toutes les fiches de test
-- Étape 1 : Supprimer toutes les signatures
DELETE FROM signatures;

-- Étape 2 : Supprimer toutes les fiches_jours
DELETE FROM fiches_jours;

-- Étape 3 : Supprimer toutes les fiches
DELETE FROM fiches;