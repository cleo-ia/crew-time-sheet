-- Purge complète des données test SDER S50

-- 1. Supprimer les signatures liées aux fiches SDER S50
DELETE FROM public.signatures
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE u.entreprise_id = '2874c40d-dae2-456b-9465-4abb91d7edbf'
  AND f.semaine = '2025-S50'
);

-- 2. Supprimer les fiches_transport_finisseurs_jours liées aux fiches SDER S50
DELETE FROM public.fiches_transport_finisseurs_jours
WHERE fiche_transport_finisseur_id IN (
  SELECT ftf.id FROM public.fiches_transport_finisseurs ftf
  JOIN public.fiches f ON ftf.fiche_id = f.id
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE u.entreprise_id = '2874c40d-dae2-456b-9465-4abb91d7edbf'
  AND ftf.semaine = '2025-S50'
);

-- 3. Supprimer les fiches_transport_finisseurs liées aux fiches SDER S50
DELETE FROM public.fiches_transport_finisseurs
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE u.entreprise_id = '2874c40d-dae2-456b-9465-4abb91d7edbf'
  AND f.semaine = '2025-S50'
);

-- 4. Supprimer les fiches_jours liées aux fiches SDER S50
DELETE FROM public.fiches_jours
WHERE fiche_id IN (
  SELECT f.id FROM public.fiches f
  JOIN public.utilisateurs u ON f.salarie_id = u.id
  WHERE u.entreprise_id = '2874c40d-dae2-456b-9465-4abb91d7edbf'
  AND f.semaine = '2025-S50'
);

-- 5. Supprimer les fiches SDER S50
DELETE FROM public.fiches
WHERE salarie_id IN (
  SELECT id FROM public.utilisateurs 
  WHERE entreprise_id = '2874c40d-dae2-456b-9465-4abb91d7edbf'
)
AND semaine = '2025-S50';

-- 6. Supprimer les affectations_finisseurs_jours SDER S50
DELETE FROM public.affectations_finisseurs_jours
WHERE semaine = '2025-S50'
AND finisseur_id IN (
  SELECT id FROM public.utilisateurs 
  WHERE entreprise_id = '2874c40d-dae2-456b-9465-4abb91d7edbf'
);