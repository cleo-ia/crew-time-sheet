-- Nettoyage des données de test
-- Ordre de suppression : du plus dépendant au moins dépendant

-- 1. Supprimer les entrées journalières des transports (dépend de fiches_transport)
DELETE FROM public.fiches_transport_jours;

-- 2. Supprimer les fiches de transport (dépend de fiches)
DELETE FROM public.fiches_transport;

-- 3. Supprimer les signatures (dépend de fiches)
DELETE FROM public.signatures;

-- 4. Supprimer les entrées journalières des fiches (dépend de fiches)
DELETE FROM public.fiches_jours;

-- 5. Supprimer les fiches principales
DELETE FROM public.fiches;