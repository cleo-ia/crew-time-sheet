-- Purge OLYMPIA S50 - Limoge Revillon
-- Étape 1: Supprimer les fiches_jours
DELETE FROM public.fiches_jours 
WHERE fiche_id IN (
  '47ca6e92-7bbc-4874-954b-4ed6920323d6',
  'f828af00-35fa-4459-8ccb-39c2d4c45a7f',
  'f40b5028-7e03-4d97-957e-2e15cb691f7a'
);

-- Étape 2: Supprimer les signatures
DELETE FROM public.signatures 
WHERE fiche_id IN (
  '47ca6e92-7bbc-4874-954b-4ed6920323d6',
  'f828af00-35fa-4459-8ccb-39c2d4c45a7f',
  'f40b5028-7e03-4d97-957e-2e15cb691f7a'
);

-- Étape 3: Supprimer les fiches
DELETE FROM public.fiches 
WHERE id IN (
  '47ca6e92-7bbc-4874-954b-4ed6920323d6',
  'f828af00-35fa-4459-8ccb-39c2d4c45a7f',
  'f40b5028-7e03-4d97-957e-2e15cb691f7a'
);