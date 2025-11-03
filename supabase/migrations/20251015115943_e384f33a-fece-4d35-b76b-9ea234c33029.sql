-- Nettoyage des données de test pour les semaines 2025-S42 et 2025-S43
-- Cette migration supprime uniquement des données de test, pas de structure

-- Étape 1: Supprimer les signatures associées aux fiches de test
DELETE FROM public.signatures
WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine IN ('2025-S42', '2025-S43')
);

-- Étape 2: Supprimer les fiches_jours (détails des heures) associées aux fiches de test
DELETE FROM public.fiches_jours
WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE semaine IN ('2025-S42', '2025-S43')
);

-- Étape 3: Supprimer les fiches de test
DELETE FROM public.fiches
WHERE semaine IN ('2025-S42', '2025-S43');