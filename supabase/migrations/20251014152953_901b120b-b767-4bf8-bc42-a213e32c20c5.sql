-- Nettoyer toutes les données de test
-- L'ordre est important pour respecter les contraintes de clés étrangères

-- 1. Supprimer toutes les signatures (référencent les fiches)
DELETE FROM public.signatures;

-- 2. Supprimer toutes les fiches_jours (référencent les fiches)
DELETE FROM public.fiches_jours;

-- 3. Supprimer toutes les fiches
DELETE FROM public.fiches;