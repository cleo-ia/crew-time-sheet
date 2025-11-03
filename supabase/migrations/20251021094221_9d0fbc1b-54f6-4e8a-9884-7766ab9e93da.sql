-- ============================================================================
-- NETTOYAGE DES DONNÉES DE TEST
-- ============================================================================
-- Supprime toutes les données opérationnelles pour repartir sur une base propre
-- Préserve les données de configuration (utilisateurs, chantiers, véhicules, etc.)

-- 1. Supprimer les signatures (dépend de fiches)
DELETE FROM signatures;

-- 2. Supprimer les détails journaliers des fiches (dépend de fiches)
DELETE FROM fiches_jours;

-- 3. Supprimer les trajets transport (dépend de fiches_transport)
DELETE FROM fiches_transport_jours;

-- 4. Supprimer les fiches transport (dépend de fiches et chantiers)
DELETE FROM fiches_transport;

-- 5. Supprimer les fiches principales
DELETE FROM fiches;

-- 6. Nettoyer l'historique des rappels
DELETE FROM rappels_historique;