-- Nettoyage des données de test - Option A
-- Ordre respectant les dépendances des clés étrangères

-- 1. Supprimer les signatures (dépend de fiches)
DELETE FROM signatures;

-- 2. Supprimer les fiches_jours (dépend de fiches)
DELETE FROM fiches_jours;

-- 3. Supprimer les fiches_transport_jours (dépend de fiches_transport)
DELETE FROM fiches_transport_jours;

-- 4. Supprimer les fiches_transport
DELETE FROM fiches_transport;

-- 5. Supprimer les fiches
DELETE FROM fiches;

-- 6. Supprimer l'historique des rappels
DELETE FROM rappels_historique;

-- Confirmation dans les logs
DO $$
BEGIN
  RAISE NOTICE '✅ Nettoyage terminé : fiches, signatures, transport et rappels supprimés';
END $$;