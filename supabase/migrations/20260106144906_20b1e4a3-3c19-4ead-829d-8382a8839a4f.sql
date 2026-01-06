-- Purge complète semaine 2026-S02
DO $$
DECLARE
  fiche_ids uuid[];
  ft_ids uuid[];
BEGIN
  -- Récupérer tous les IDs de fiches pour S02
  SELECT ARRAY_AGG(id) INTO fiche_ids
  FROM fiches
  WHERE semaine = '2026-S02';
  
  IF fiche_ids IS NULL THEN
    RAISE NOTICE 'Aucune fiche trouvée pour 2026-S02';
    RETURN;
  END IF;
  
  -- Récupérer les IDs fiches_transport
  SELECT ARRAY_AGG(id) INTO ft_ids
  FROM fiches_transport
  WHERE fiche_id = ANY(fiche_ids);
  
  -- 1. Supprimer fiches_transport_jours
  IF ft_ids IS NOT NULL THEN
    DELETE FROM fiches_transport_jours WHERE fiche_transport_id = ANY(ft_ids);
  END IF;
  
  -- 2. Supprimer fiches_transport
  DELETE FROM fiches_transport WHERE fiche_id = ANY(fiche_ids);
  
  -- 3. Supprimer ratios_journaliers
  DELETE FROM ratios_journaliers WHERE fiche_id = ANY(fiche_ids);
  
  -- 4. Supprimer signatures
  DELETE FROM signatures WHERE fiche_id = ANY(fiche_ids);
  
  -- 5. Supprimer fiches_jours
  DELETE FROM fiches_jours WHERE fiche_id = ANY(fiche_ids);
  
  -- 6. Supprimer fiches
  DELETE FROM fiches WHERE id = ANY(fiche_ids);
  
  RAISE NOTICE 'Purge S02 terminée: % fiches supprimées', array_length(fiche_ids, 1);
END $$;