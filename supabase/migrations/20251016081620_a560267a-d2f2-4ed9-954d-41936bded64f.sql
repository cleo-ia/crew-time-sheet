-- Nettoyage des données de test
-- Suppression dans l'ordre pour respecter les contraintes FK

-- 1. Supprimer les signatures (référencent fiches)
DELETE FROM public.signatures;

-- 2. Supprimer les fiches_jours (référencent fiches)
DELETE FROM public.fiches_jours;

-- 3. Supprimer les fiches
DELETE FROM public.fiches;