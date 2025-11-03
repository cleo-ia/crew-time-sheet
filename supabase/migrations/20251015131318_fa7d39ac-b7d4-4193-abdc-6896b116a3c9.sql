-- Nettoyage des données de test pour repartir à zéro
-- Supprimer dans l'ordre pour respecter les contraintes de clés étrangères

-- 1. Supprimer toutes les signatures (12 entrées)
DELETE FROM signatures;

-- 2. Supprimer tous les détails journaliers (60 entrées)
DELETE FROM fiches_jours;

-- 3. Supprimer toutes les fiches principales (12 entrées)
DELETE FROM fiches;