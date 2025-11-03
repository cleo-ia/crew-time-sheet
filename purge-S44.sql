-- ============================================================================
-- SCRIPT DE PURGE DES DONNÉES DE TEST - SEMAINE 2025-S44
-- ============================================================================
-- Ce script supprime toutes les données de test pour la semaine 2025-S44
-- Exécution : Copier-coller dans l'éditeur SQL de Supabase
-- ============================================================================

-- Désactiver temporairement les triggers pour éviter les problèmes
SET session_replication_role = 'replica';

-- Étape 1 : Suppression des signatures (10 records)
DELETE FROM public.signatures
WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine = '2025-S44'
);

-- Étape 2 : Suppression des fiches_transport_finisseurs_jours (7 records)
DELETE FROM public.fiches_transport_finisseurs_jours
WHERE fiche_transport_finisseur_id IN (
  SELECT id FROM public.fiches_transport_finisseurs WHERE semaine = '2025-S44'
);

-- Étape 3 : Suppression des fiches_transport_finisseurs (2 records)
DELETE FROM public.fiches_transport_finisseurs
WHERE semaine = '2025-S44';

-- Étape 4 : Suppression des fiches_transport_jours (12 records)
DELETE FROM public.fiches_transport_jours
WHERE fiche_transport_id IN (
  SELECT id FROM public.fiches_transport WHERE semaine = '2025-S44'
);

-- Étape 5 : Suppression des fiches_transport (1 record)
DELETE FROM public.fiches_transport
WHERE semaine = '2025-S44';

-- Étape 6 : Suppression des fiches_jours (30 records)
DELETE FROM public.fiches_jours
WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine = '2025-S44'
);

-- Étape 7 : Suppression des fiches (6 records)
DELETE FROM public.fiches
WHERE semaine = '2025-S44';

-- Réactiver les triggers
SET session_replication_role = 'origin';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Compter les enregistrements restants pour S44 (devrait retourner 0 partout)
SELECT 'signatures' as table_name, COUNT(*) as count FROM public.signatures 
WHERE fiche_id IN (SELECT id FROM public.fiches WHERE semaine = '2025-S44')
UNION ALL
SELECT 'fiches_transport_finisseurs_jours', COUNT(*) FROM public.fiches_transport_finisseurs_jours
WHERE fiche_transport_finisseur_id IN (SELECT id FROM public.fiches_transport_finisseurs WHERE semaine = '2025-S44')
UNION ALL
SELECT 'fiches_transport_finisseurs', COUNT(*) FROM public.fiches_transport_finisseurs WHERE semaine = '2025-S44'
UNION ALL
SELECT 'fiches_transport_jours', COUNT(*) FROM public.fiches_transport_jours
WHERE fiche_transport_id IN (SELECT id FROM public.fiches_transport WHERE semaine = '2025-S44')
UNION ALL
SELECT 'fiches_transport', COUNT(*) FROM public.fiches_transport WHERE semaine = '2025-S44'
UNION ALL
SELECT 'fiches_jours', COUNT(*) FROM public.fiches_jours
WHERE fiche_id IN (SELECT id FROM public.fiches WHERE semaine = '2025-S44')
UNION ALL
SELECT 'fiches', COUNT(*) FROM public.fiches WHERE semaine = '2025-S44';

-- ============================================================================
-- RÉSULTAT ATTENDU
-- ============================================================================
/*
✅ Données supprimées pour la semaine 2025-S44 :
- 10 signatures
- 7 fiches_transport_finisseurs_jours
- 2 fiches_transport_finisseurs
- 12 fiches_transport_jours
- 1 fiches_transport
- 30 fiches_jours
- 6 fiches

Total : 68 enregistrements supprimés
*/
