-- ============================================================================
-- SCRIPT DE PURGE COMPLÈTE DES DONNÉES DE TEST
-- ============================================================================
-- Ce script supprime TOUTES les données de test de l'application
-- Exécution : Copier-coller dans l'éditeur SQL de Supabase
-- ATTENTION : Cette action est IRRÉVERSIBLE
-- ============================================================================

-- Désactiver temporairement les triggers pour éviter les problèmes
SET session_replication_role = 'replica';

-- ============================================================================
-- ÉTAPE 1 : Suppression des signatures
-- ============================================================================
DELETE FROM public.signatures;

-- ============================================================================
-- ÉTAPE 2 : Suppression des données de transport finisseurs
-- ============================================================================
DELETE FROM public.fiches_transport_finisseurs_jours;
DELETE FROM public.fiches_transport_finisseurs;

-- ============================================================================
-- ÉTAPE 3 : Suppression des données de transport maçons
-- ============================================================================
DELETE FROM public.fiches_transport_jours;
DELETE FROM public.fiches_transport;

-- ============================================================================
-- ÉTAPE 4 : Suppression des affectations finisseurs
-- ============================================================================
DELETE FROM public.affectations_finisseurs_jours;

-- ============================================================================
-- ÉTAPE 5 : Suppression des fiches jours et fiches
-- ============================================================================
DELETE FROM public.fiches_jours;
DELETE FROM public.fiches;

-- ============================================================================
-- ÉTAPE 6 : Suppression des affectations maçons
-- ============================================================================
DELETE FROM public.affectations;

-- ============================================================================
-- ÉTAPE 7 : Suppression des périodes clôturées
-- ============================================================================
DELETE FROM public.periodes_cloturees;

-- ============================================================================
-- ÉTAPE 8 : Suppression de l'historique des rappels
-- ============================================================================
DELETE FROM public.rappels_historique;

-- Réactiver les triggers
SET session_replication_role = 'origin';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Compter les enregistrements restants (devrait retourner 0 partout)
SELECT 'signatures' as table_name, COUNT(*) as count FROM public.signatures
UNION ALL
SELECT 'fiches_transport_finisseurs_jours', COUNT(*) FROM public.fiches_transport_finisseurs_jours
UNION ALL
SELECT 'fiches_transport_finisseurs', COUNT(*) FROM public.fiches_transport_finisseurs
UNION ALL
SELECT 'fiches_transport_jours', COUNT(*) FROM public.fiches_transport_jours
UNION ALL
SELECT 'fiches_transport', COUNT(*) FROM public.fiches_transport
UNION ALL
SELECT 'affectations_finisseurs_jours', COUNT(*) FROM public.affectations_finisseurs_jours
UNION ALL
SELECT 'fiches_jours', COUNT(*) FROM public.fiches_jours
UNION ALL
SELECT 'fiches', COUNT(*) FROM public.fiches
UNION ALL
SELECT 'affectations', COUNT(*) FROM public.affectations
UNION ALL
SELECT 'periodes_cloturees', COUNT(*) FROM public.periodes_cloturees
UNION ALL
SELECT 'rappels_historique', COUNT(*) FROM public.rappels_historique;

-- ============================================================================
-- RÉSULTAT ATTENDU
-- ============================================================================
/*
✅ Toutes les données de test supprimées :
- Signatures
- Fiches transport finisseurs (jours + fiches)
- Fiches transport maçons (jours + fiches)
- Affectations finisseurs
- Fiches jours et fiches
- Affectations maçons
- Périodes clôturées
- Historique des rappels

⚠️ ATTENTION : 
- Les utilisateurs, chantiers et véhicules sont conservés
- Cette action est IRRÉVERSIBLE
*/
