-- Purge fiche test S02 pour le chantier "test"
DO $$
DECLARE
  fiche_ids uuid[] := ARRAY[
    '9f788105-74a1-4509-b72b-bc953d981c11'::uuid,
    '3d1f1719-e6d6-4cf0-a9bc-77db8a26d72e'::uuid
  ];
  ft_ids uuid[];
BEGIN
  -- 1. Récupérer les IDs fiches_transport
  SELECT ARRAY_AGG(id) INTO ft_ids
  FROM fiches_transport
  WHERE fiche_id = ANY(fiche_ids);
  
  -- 2. Supprimer fiches_transport_jours
  IF ft_ids IS NOT NULL THEN
    DELETE FROM fiches_transport_jours WHERE fiche_transport_id = ANY(ft_ids);
  END IF;
  
  -- 3. Supprimer fiches_transport
  DELETE FROM fiches_transport WHERE fiche_id = ANY(fiche_ids);
  
  -- 4. Supprimer signatures
  DELETE FROM signatures WHERE fiche_id = ANY(fiche_ids);
  
  -- 5. Supprimer fiches_jours
  DELETE FROM fiches_jours WHERE fiche_id = ANY(fiche_ids);
  
  -- 6. Supprimer fiches
  DELETE FROM fiches WHERE id = ANY(fiche_ids);
  
  RAISE NOTICE 'Purge terminée pour 2 fiches du chantier test S02';
END $$;