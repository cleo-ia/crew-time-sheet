-- Nettoyer les données de test
-- Ordre: signatures → fiches_jours → fiches (respect des foreign keys)

DELETE FROM public.signatures;
DELETE FROM public.fiches_jours;
DELETE FROM public.fiches;