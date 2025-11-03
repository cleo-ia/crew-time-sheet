-- Nettoyage des données de test
-- Suppression dans l'ordre pour respecter les contraintes de clés étrangères

-- 1. Supprimer les signatures (dépend de fiches)
DELETE FROM signatures;

-- 2. Supprimer les fiches_jours (dépend de fiches)
DELETE FROM fiches_jours;

-- 3. Supprimer les fiches (table principale)
DELETE FROM fiches;

-- 4. Supprimer les fiches_transport_jours (dépend de fiches_transport)
DELETE FROM fiches_transport_jours;

-- 5. Supprimer les fiches_transport (table principale)
DELETE FROM fiches_transport;