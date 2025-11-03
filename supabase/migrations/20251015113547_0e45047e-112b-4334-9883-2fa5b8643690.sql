-- Suppression des fiches d'heures et données associées
-- Ordre important pour respecter les contraintes de clés étrangères

-- 1. Supprimer les signatures (dépendent des fiches)
DELETE FROM public.signatures;

-- 2. Supprimer les détails quotidiens des fiches (dépendent des fiches)
DELETE FROM public.fiches_jours;

-- 3. Supprimer les fiches principales
DELETE FROM public.fiches;