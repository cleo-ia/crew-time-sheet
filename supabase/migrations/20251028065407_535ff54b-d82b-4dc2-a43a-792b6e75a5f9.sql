
-- Suppression des données S44 pour permettre une réinitialisation avec 39h (8+8+8+8+7)

-- 1. Supprimer les jours de fiches transport finisseurs pour S44
DELETE FROM public.fiches_transport_finisseurs_jours
WHERE fiche_transport_finisseur_id IN (
  SELECT id FROM public.fiches_transport_finisseurs WHERE semaine = '2025-S44'
);

-- 2. Supprimer les fiches transport finisseurs pour S44
DELETE FROM public.fiches_transport_finisseurs WHERE semaine = '2025-S44';

-- 3. Supprimer les jours de fiches transport pour S44
DELETE FROM public.fiches_transport_jours
WHERE fiche_transport_id IN (
  SELECT id FROM public.fiches_transport WHERE semaine = '2025-S44'
);

-- 4. Supprimer les fiches transport pour S44
DELETE FROM public.fiches_transport WHERE semaine = '2025-S44';

-- 5. Supprimer les signatures pour S44
DELETE FROM public.signatures
WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine = '2025-S44'
);

-- 6. Supprimer les jours de fiches pour S44
DELETE FROM public.fiches_jours
WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine = '2025-S44'
);

-- 7. Supprimer les fiches pour S44
DELETE FROM public.fiches WHERE semaine = '2025-S44';

-- 8. Supprimer les affectations finisseurs jours pour S44
DELETE FROM public.affectations_finisseurs_jours WHERE semaine = '2025-S44';
