-- Nettoyage des données de test
-- L'ordre est important pour respecter les contraintes de clés étrangères

-- 1. Supprimer toutes les signatures
DELETE FROM signatures;

-- 2. Supprimer toutes les fiches_jours
DELETE FROM fiches_jours;

-- 3. Supprimer toutes les fiches
DELETE FROM fiches;