-- Suppression complète des données de test S43 et S44
-- Ordre critique pour respecter les contraintes de clés étrangères

-- 1. Supprimer les signatures (dépendent des fiches)
DELETE FROM public.signatures 
WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine IN ('2025-S43', '2025-S44')
);

-- 2. Supprimer les fiches_transport_finisseurs_jours (dépendent de fiches_transport_finisseurs)
DELETE FROM public.fiches_transport_finisseurs_jours
WHERE fiche_transport_finisseur_id IN (
  SELECT id FROM public.fiches_transport_finisseurs WHERE semaine IN ('2025-S43', '2025-S44')
);

-- 3. Supprimer les fiches_transport_finisseurs
DELETE FROM public.fiches_transport_finisseurs 
WHERE semaine IN ('2025-S43', '2025-S44');

-- 4. Supprimer les fiches_jours (dépendent des fiches)
DELETE FROM public.fiches_jours 
WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine IN ('2025-S43', '2025-S44')
);

-- 5. Supprimer les affectations_finisseurs_jours
DELETE FROM public.affectations_finisseurs_jours 
WHERE semaine IN ('2025-S43', '2025-S44');

-- 6. Supprimer les fiches (table principale)
DELETE FROM public.fiches 
WHERE semaine IN ('2025-S43', '2025-S44');