-- Suppression de toutes les données de test pour repartir sur une base propre

-- 1. Supprimer toutes les signatures
DELETE FROM public.signatures;

-- 2. Supprimer tous les fiches_jours
DELETE FROM public.fiches_jours;

-- 3. Supprimer toutes les fiches
DELETE FROM public.fiches;