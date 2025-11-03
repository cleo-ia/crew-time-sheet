-- Nettoyer les données de test
-- Ordre important pour respecter les contraintes de clés étrangères

-- Supprimer les signatures (référencent fiches)
DELETE FROM public.signatures;

-- Supprimer les détails journaliers (référencent fiches)
DELETE FROM public.fiches_jours;

-- Supprimer les fiches
DELETE FROM public.fiches;