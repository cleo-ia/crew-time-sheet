-- Purge des données de test pour "test 2" (id: 8a0f1c61-23f0-4610-8e8a-69a806c4e147) 
-- et "Hafedh AOUEL MAHMOUD" (id: 4218513c-03f2-4e30-8a55-18fdb8a9fa9a)

-- 1. Supprimer les signatures liées aux fiches de ces utilisateurs
DELETE FROM public.signatures WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE salarie_id IN (
    '8a0f1c61-23f0-4610-8e8a-69a806c4e147',
    '4218513c-03f2-4e30-8a55-18fdb8a9fa9a'
  )
);

-- 2. Supprimer les ratios journaliers
DELETE FROM public.ratios_journaliers WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE salarie_id IN (
    '8a0f1c61-23f0-4610-8e8a-69a806c4e147',
    '4218513c-03f2-4e30-8a55-18fdb8a9fa9a'
  )
);

-- 3. Supprimer les fiches transport finisseurs jours
DELETE FROM public.fiches_transport_finisseurs_jours WHERE fiche_transport_finisseur_id IN (
  SELECT ftf.id FROM public.fiches_transport_finisseurs ftf
  JOIN public.fiches f ON ftf.fiche_id = f.id
  WHERE f.salarie_id IN (
    '8a0f1c61-23f0-4610-8e8a-69a806c4e147',
    '4218513c-03f2-4e30-8a55-18fdb8a9fa9a'
  )
);

-- 4. Supprimer les fiches transport finisseurs
DELETE FROM public.fiches_transport_finisseurs WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE salarie_id IN (
    '8a0f1c61-23f0-4610-8e8a-69a806c4e147',
    '4218513c-03f2-4e30-8a55-18fdb8a9fa9a'
  )
);

-- 5. Supprimer les fiches transport jours
DELETE FROM public.fiches_transport_jours WHERE fiche_transport_id IN (
  SELECT ft.id FROM public.fiches_transport ft
  JOIN public.fiches f ON ft.fiche_id = f.id
  WHERE f.salarie_id IN (
    '8a0f1c61-23f0-4610-8e8a-69a806c4e147',
    '4218513c-03f2-4e30-8a55-18fdb8a9fa9a'
  )
);

-- 6. Supprimer les fiches transport
DELETE FROM public.fiches_transport WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE salarie_id IN (
    '8a0f1c61-23f0-4610-8e8a-69a806c4e147',
    '4218513c-03f2-4e30-8a55-18fdb8a9fa9a'
  )
);

-- 7. Supprimer les fiches jours
DELETE FROM public.fiches_jours WHERE fiche_id IN (
  SELECT id FROM public.fiches WHERE salarie_id IN (
    '8a0f1c61-23f0-4610-8e8a-69a806c4e147',
    '4218513c-03f2-4e30-8a55-18fdb8a9fa9a'
  )
);

-- 8. Supprimer les fiches
DELETE FROM public.fiches WHERE salarie_id IN (
  '8a0f1c61-23f0-4610-8e8a-69a806c4e147',
  '4218513c-03f2-4e30-8a55-18fdb8a9fa9a'
);

-- 9. Supprimer les affectations finisseurs jours
DELETE FROM public.affectations_finisseurs_jours WHERE finisseur_id IN (
  '8a0f1c61-23f0-4610-8e8a-69a806c4e147',
  '4218513c-03f2-4e30-8a55-18fdb8a9fa9a'
);

-- 10. Supprimer les affectations maçons
DELETE FROM public.affectations WHERE macon_id IN (
  '8a0f1c61-23f0-4610-8e8a-69a806c4e147',
  '4218513c-03f2-4e30-8a55-18fdb8a9fa9a'
);