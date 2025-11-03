
-- Purge complète des données de test
-- Ordre important pour respecter les contraintes de clés étrangères

-- 1. Supprimer les signatures
DELETE FROM signatures;

-- 2. Supprimer les fiches_transport_finisseurs_jours
DELETE FROM fiches_transport_finisseurs_jours;

-- 3. Supprimer les fiches_transport_finisseurs
DELETE FROM fiches_transport_finisseurs;

-- 4. Supprimer les fiches_transport_jours
DELETE FROM fiches_transport_jours;

-- 5. Supprimer les fiches_transport
DELETE FROM fiches_transport;

-- 6. Supprimer les affectations_finisseurs_jours
DELETE FROM affectations_finisseurs_jours;

-- 7. Supprimer les fiches_jours
DELETE FROM fiches_jours;

-- 8. Supprimer les fiches
DELETE FROM fiches;

-- 9. Supprimer les affectations
DELETE FROM affectations;
