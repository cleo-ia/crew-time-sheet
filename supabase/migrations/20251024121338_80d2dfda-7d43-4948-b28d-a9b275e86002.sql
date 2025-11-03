-- CORRECTION DES DONNÉES S43 (Semaine 2025-S43)
-- Supprimer les fiches_jours pour les jours NON affectés

-- Pour Aya (finisseur_id à identifier) : supprimer mardi, jeudi, vendredi
-- Pour Mehdi (finisseur_id à identifier) : supprimer vendredi

-- Identifier les fiches concernées
DO $$
DECLARE
  aya_user_id uuid;
  mehdi_user_id uuid;
  aya_fiche_id uuid;
  mehdi_fiche_id uuid;
BEGIN
  -- Trouver l'ID d'Aya
  SELECT id INTO aya_user_id
  FROM utilisateurs
  WHERE prenom ILIKE 'Aya' AND nom ILIKE '%'
  LIMIT 1;

  -- Trouver l'ID de Mehdi
  SELECT id INTO mehdi_user_id
  FROM utilisateurs
  WHERE prenom ILIKE 'Mehdi' AND nom ILIKE '%'
  LIMIT 1;

  -- Trouver la fiche d'Aya pour S43
  SELECT id INTO aya_fiche_id
  FROM fiches
  WHERE salarie_id = aya_user_id
    AND semaine = '2025-S43'
    AND chantier_id IS NULL
  LIMIT 1;

  -- Trouver la fiche de Mehdi pour S43
  SELECT id INTO mehdi_fiche_id
  FROM fiches
  WHERE salarie_id = mehdi_user_id
    AND semaine = '2025-S43'
    AND chantier_id IS NULL
  LIMIT 1;

  -- Supprimer les jours non affectés pour Aya (mardi 21, jeudi 23, vendredi 24)
  IF aya_fiche_id IS NOT NULL THEN
    DELETE FROM fiches_jours
    WHERE fiche_id = aya_fiche_id
      AND date IN ('2025-10-21', '2025-10-23', '2025-10-24');
    
    RAISE NOTICE 'Suppression des jours non affectés pour Aya (fiche_id: %)', aya_fiche_id;
  END IF;

  -- Supprimer le vendredi pour Mehdi
  IF mehdi_fiche_id IS NOT NULL THEN
    DELETE FROM fiches_jours
    WHERE fiche_id = mehdi_fiche_id
      AND date = '2025-10-24';
    
    RAISE NOTICE 'Suppression du vendredi pour Mehdi (fiche_id: %)', mehdi_fiche_id;
  END IF;
END $$;

-- Vérification : les totaux devraient maintenant être corrects
-- Aya devrait avoir 16h (2 jours × 8h)
-- Mehdi devrait avoir 32h (4 jours × 8h)