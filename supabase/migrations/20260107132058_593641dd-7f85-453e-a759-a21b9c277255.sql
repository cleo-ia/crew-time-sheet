
-- Purge des données de janvier 2026 (S01 à S04)

-- 1. Supprimer les ratios journaliers liés aux fiches
DELETE FROM public.ratios_journaliers
WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine IN ('2026-S01', '2026-S02', '2026-S03', '2026-S04')
);

-- 2. Supprimer les signatures liées aux fiches
DELETE FROM public.signatures
WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine IN ('2026-S01', '2026-S02', '2026-S03', '2026-S04')
);

-- 3. Supprimer les modifications liées aux fiches
DELETE FROM public.fiches_modifications
WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine IN ('2026-S01', '2026-S02', '2026-S03', '2026-S04')
);

-- 4. Supprimer les jours de transport finisseurs
DELETE FROM public.fiches_transport_finisseurs_jours
WHERE fiche_transport_finisseur_id IN (
  SELECT ftf.id FROM public.fiches_transport_finisseurs ftf
  WHERE ftf.semaine IN ('2026-S01', '2026-S02', '2026-S03', '2026-S04')
);

-- 5. Supprimer les fiches transport finisseurs
DELETE FROM public.fiches_transport_finisseurs
WHERE semaine IN ('2026-S01', '2026-S02', '2026-S03', '2026-S04');

-- 6. Supprimer les jours de transport
DELETE FROM public.fiches_transport_jours
WHERE fiche_transport_id IN (
  SELECT ft.id FROM public.fiches_transport ft
  WHERE ft.semaine IN ('2026-S01', '2026-S02', '2026-S03', '2026-S04')
);

-- 7. Supprimer les fiches transport
DELETE FROM public.fiches_transport
WHERE semaine IN ('2026-S01', '2026-S02', '2026-S03', '2026-S04');

-- 8. Supprimer les fiches jours
DELETE FROM public.fiches_jours
WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine IN ('2026-S01', '2026-S02', '2026-S03', '2026-S04')
);

-- 9. Supprimer les affectations finisseurs jours
DELETE FROM public.affectations_finisseurs_jours
WHERE semaine IN ('2026-S01', '2026-S02', '2026-S03', '2026-S04');

-- 10. Enfin, supprimer les fiches elles-mêmes
DELETE FROM public.fiches
WHERE semaine IN ('2026-S01', '2026-S02', '2026-S03', '2026-S04');
