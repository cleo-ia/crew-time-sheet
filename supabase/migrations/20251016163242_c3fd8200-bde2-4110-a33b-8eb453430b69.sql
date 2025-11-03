-- Suppression de toutes les données de test
-- Ordre important pour respecter les contraintes de clés étrangères

-- 1. Supprimer les signatures
DELETE FROM public.signatures;

-- 2. Supprimer les détails journaliers du transport
DELETE FROM public.fiches_transport_jours;

-- 3. Supprimer les fiches de transport
DELETE FROM public.fiches_transport;

-- 4. Supprimer les détails journaliers des fiches
DELETE FROM public.fiches_jours;

-- 5. Supprimer les fiches
DELETE FROM public.fiches;