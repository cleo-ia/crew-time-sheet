-- Nettoyage des données de test
-- Suppression dans l'ordre pour respecter les foreign keys

DELETE FROM public.signatures;
DELETE FROM public.fiches_jours;
DELETE FROM public.fiches;