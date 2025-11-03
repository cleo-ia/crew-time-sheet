-- Deuxième nettoyage des données de test
-- Suppression dans l'ordre pour respecter les contraintes FK

-- 1. Supprimer les signatures (14 enregistrements, référencent fiches)
DELETE FROM public.signatures;

-- 2. Supprimer les fiches_jours (90 enregistrements, référencent fiches)
DELETE FROM public.fiches_jours;

-- 3. Supprimer les fiches (18 enregistrements)
DELETE FROM public.fiches;