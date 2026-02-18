-- Purge fiche fantôme Branislav BENCUN - Semaine 2026-S02
-- Fiche ID: 7f72b30b-1a2d-4789-9dbb-d93bb57ccb2a

-- 1. Supprimer les signatures liées
DELETE FROM public.signatures WHERE fiche_id = '7f72b30b-1a2d-4789-9dbb-d93bb57ccb2a';

-- 2. Supprimer les 5 fiches_jours (05/01 au 09/01, toutes à 0h)
DELETE FROM public.fiches_jours WHERE fiche_id = '7f72b30b-1a2d-4789-9dbb-d93bb57ccb2a';

-- 3. Supprimer la fiche elle-même
DELETE FROM public.fiches WHERE id = '7f72b30b-1a2d-4789-9dbb-d93bb57ccb2a';