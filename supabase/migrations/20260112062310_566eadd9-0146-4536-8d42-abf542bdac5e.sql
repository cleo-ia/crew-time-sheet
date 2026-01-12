-- Purge des données de test pour la semaine 2026-S02
-- Ordre de suppression pour respecter les contraintes FK

-- 1. Supprimer les affectations finisseurs jours
DELETE FROM public.affectations_finisseurs_jours WHERE semaine = '2026-S02';

-- 2. Supprimer les signatures liées aux fiches de cette semaine
DELETE FROM public.signatures WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine = '2026-S02'
);

-- 3. Supprimer les ratios journaliers
DELETE FROM public.ratios_journaliers WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine = '2026-S02'
);

-- 4. Supprimer les fiches transport finisseurs jours
DELETE FROM public.fiches_transport_finisseurs_jours WHERE fiche_transport_finisseur_id IN (
  SELECT id FROM public.fiches_transport_finisseurs WHERE semaine = '2026-S02'
);

-- 5. Supprimer les fiches transport finisseurs
DELETE FROM public.fiches_transport_finisseurs WHERE semaine = '2026-S02';

-- 6. Supprimer les fiches transport jours
DELETE FROM public.fiches_transport_jours WHERE fiche_transport_id IN (
  SELECT id FROM public.fiches_transport WHERE semaine = '2026-S02'
);

-- 7. Supprimer les fiches transport
DELETE FROM public.fiches_transport WHERE semaine = '2026-S02';

-- 8. Supprimer les fiches jours
DELETE FROM public.fiches_jours WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine = '2026-S02'
);

-- 9. Supprimer les fiches
DELETE FROM public.fiches WHERE semaine = '2026-S02';

-- 10. Supprimer les affectations maçons pour cette semaine (date_debut dans la semaine)
DELETE FROM public.affectations WHERE date_debut >= '2026-01-05' AND date_debut <= '2026-01-11';