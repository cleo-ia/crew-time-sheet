
-- PURGE DES DONNÉES DE TEST 2026 (S01, S02, S03, S04)
-- ============================================================================

-- Désactiver temporairement les triggers
SET session_replication_role = 'replica';

-- 1. Récupérer les IDs des utilisateurs de test
-- (nom contient 'test' ou utilisateurs test spécifiques)
DO $$
DECLARE
  test_user_ids uuid[];
  test_fiche_ids uuid[];
BEGIN
  -- Identifier les utilisateurs de test
  SELECT ARRAY_AGG(id) INTO test_user_ids
  FROM public.utilisateurs
  WHERE LOWER(nom) LIKE '%test%' 
     OR LOWER(prenom) LIKE '%test%'
     OR (prenom = 'test' AND nom IN ('2', '3', '4'));
  
  -- Identifier les fiches de test (semaines 2026)
  SELECT ARRAY_AGG(id) INTO test_fiche_ids
  FROM public.fiches
  WHERE salarie_id = ANY(test_user_ids)
    AND semaine LIKE '2026-%';
  
  -- Log pour debug
  RAISE NOTICE 'Test user IDs: %', test_user_ids;
  RAISE NOTICE 'Test fiche IDs: %', test_fiche_ids;
END $$;

-- 2. Supprimer les ratios journaliers
DELETE FROM public.ratios_journaliers
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE (LOWER(u.nom) LIKE '%test%' OR LOWER(u.prenom) LIKE '%test%' OR (u.prenom = 'test' AND u.nom IN ('2', '3', '4')))
    AND f.semaine LIKE '2026-%'
);

-- 3. Supprimer les signatures
DELETE FROM public.signatures
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE (LOWER(u.nom) LIKE '%test%' OR LOWER(u.prenom) LIKE '%test%' OR (u.prenom = 'test' AND u.nom IN ('2', '3', '4')))
    AND f.semaine LIKE '2026-%'
);

-- 4. Supprimer les fiches_transport_finisseurs_jours
DELETE FROM public.fiches_transport_finisseurs_jours
WHERE fiche_transport_finisseur_id IN (
  SELECT ftf.id FROM public.fiches_transport_finisseurs ftf
  JOIN public.fiches f ON ftf.fiche_id = f.id
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE (LOWER(u.nom) LIKE '%test%' OR LOWER(u.prenom) LIKE '%test%' OR (u.prenom = 'test' AND u.nom IN ('2', '3', '4')))
    AND ftf.semaine LIKE '2026-%'
);

-- 5. Supprimer les fiches_transport_finisseurs
DELETE FROM public.fiches_transport_finisseurs
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE (LOWER(u.nom) LIKE '%test%' OR LOWER(u.prenom) LIKE '%test%' OR (u.prenom = 'test' AND u.nom IN ('2', '3', '4')))
    AND semaine LIKE '2026-%'
);

-- 6. Supprimer les fiches_transport_jours
DELETE FROM public.fiches_transport_jours
WHERE fiche_transport_id IN (
  SELECT ft.id FROM public.fiches_transport ft
  JOIN public.fiches f ON ft.fiche_id = f.id
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE (LOWER(u.nom) LIKE '%test%' OR LOWER(u.prenom) LIKE '%test%' OR (u.prenom = 'test' AND u.nom IN ('2', '3', '4')))
    AND ft.semaine LIKE '2026-%'
);

-- 7. Supprimer les fiches_transport
DELETE FROM public.fiches_transport
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE (LOWER(u.nom) LIKE '%test%' OR LOWER(u.prenom) LIKE '%test%' OR (u.prenom = 'test' AND u.nom IN ('2', '3', '4')))
    AND semaine LIKE '2026-%'
);

-- 8. Supprimer les fiches_jours
DELETE FROM public.fiches_jours
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE (LOWER(u.nom) LIKE '%test%' OR LOWER(u.prenom) LIKE '%test%' OR (u.prenom = 'test' AND u.nom IN ('2', '3', '4')))
    AND f.semaine LIKE '2026-%'
);

-- 9. Supprimer les fiches
DELETE FROM public.fiches
WHERE id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE (LOWER(u.nom) LIKE '%test%' OR LOWER(u.prenom) LIKE '%test%' OR (u.prenom = 'test' AND u.nom IN ('2', '3', '4')))
    AND f.semaine LIKE '2026-%'
);

-- 10. Supprimer les affectations de test
DELETE FROM public.affectations
WHERE macon_id IN (
  SELECT id FROM public.utilisateurs
  WHERE LOWER(nom) LIKE '%test%' 
     OR LOWER(prenom) LIKE '%test%'
     OR (prenom = 'test' AND nom IN ('2', '3', '4'))
);

-- Réactiver les triggers
SET session_replication_role = 'origin';
