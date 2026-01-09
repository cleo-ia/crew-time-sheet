
-- PURGE DES DONNÉES DU CHANTIER TEST (CI000) POUR 2026
-- ============================================================================

SET session_replication_role = 'replica';

-- 1. Supprimer les ratios journaliers
DELETE FROM public.ratios_journaliers
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.chantiers c ON f.chantier_id = c.id
  WHERE c.code_chantier = 'CI000'
    AND f.semaine LIKE '2026-%'
);

-- 2. Supprimer les signatures
DELETE FROM public.signatures
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.chantiers c ON f.chantier_id = c.id
  WHERE c.code_chantier = 'CI000'
    AND f.semaine LIKE '2026-%'
);

-- 3. Supprimer les fiches_transport_finisseurs_jours
DELETE FROM public.fiches_transport_finisseurs_jours
WHERE fiche_transport_finisseur_id IN (
  SELECT ftf.id FROM public.fiches_transport_finisseurs ftf
  JOIN public.fiches f ON ftf.fiche_id = f.id
  JOIN public.chantiers c ON f.chantier_id = c.id
  WHERE c.code_chantier = 'CI000'
    AND ftf.semaine LIKE '2026-%'
);

-- 4. Supprimer les fiches_transport_finisseurs
DELETE FROM public.fiches_transport_finisseurs
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.chantiers c ON f.chantier_id = c.id
  WHERE c.code_chantier = 'CI000'
    AND semaine LIKE '2026-%'
);

-- 5. Supprimer les fiches_transport_jours
DELETE FROM public.fiches_transport_jours
WHERE fiche_transport_id IN (
  SELECT ft.id FROM public.fiches_transport ft
  JOIN public.fiches f ON ft.fiche_id = f.id
  JOIN public.chantiers c ON f.chantier_id = c.id
  WHERE c.code_chantier = 'CI000'
    AND ft.semaine LIKE '2026-%'
);

-- 6. Supprimer les fiches_transport
DELETE FROM public.fiches_transport
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.chantiers c ON f.chantier_id = c.id
  WHERE c.code_chantier = 'CI000'
    AND semaine LIKE '2026-%'
);

-- 7. Supprimer les fiches_jours
DELETE FROM public.fiches_jours
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.chantiers c ON f.chantier_id = c.id
  WHERE c.code_chantier = 'CI000'
    AND f.semaine LIKE '2026-%'
);

-- 8. Supprimer les fiches du chantier test
DELETE FROM public.fiches
WHERE id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.chantiers c ON f.chantier_id = c.id
  WHERE c.code_chantier = 'CI000'
    AND f.semaine LIKE '2026-%'
);

-- 9. Supprimer aussi les fiches des finisseurs Marco PEREIRA DE CASTRO (S01, S03, S04)
DELETE FROM public.fiches_jours
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE u.nom = 'PEREIRA DE CASTRO'
    AND f.semaine LIKE '2026-%'
);

DELETE FROM public.fiches
WHERE id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE u.nom = 'PEREIRA DE CASTRO'
    AND f.semaine LIKE '2026-%'
);

-- 10. Supprimer les affectations liées au chantier test
DELETE FROM public.affectations
WHERE chantier_id IN (
  SELECT id FROM public.chantiers WHERE code_chantier = 'CI000'
);

SET session_replication_role = 'origin';
