-- Nettoyage complet des données de test
-- Supprimer d'abord les signatures (dépendent des fiches)
DELETE FROM signatures;

-- Supprimer ensuite les fiches_jours (dépendent des fiches)
DELETE FROM fiches_jours;

-- Supprimer enfin les fiches
DELETE FROM fiches;
