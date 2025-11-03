-- Ajouter le champ periode pour gérer plusieurs véhicules par jour
-- Chaque véhicule aura 2 lignes : une pour MATIN (conducteur_aller) et une pour SOIR (conducteur_retour)

-- 1. Supprimer la contrainte unique existante sur (fiche_transport_id, date)
ALTER TABLE fiches_transport_jours 
DROP CONSTRAINT IF EXISTS fiches_transport_jours_fiche_transport_id_date_key;

-- 2. Ajouter le champ periode (nullable au départ)
ALTER TABLE fiches_transport_jours 
ADD COLUMN IF NOT EXISTS periode TEXT CHECK (periode IN ('MATIN', 'SOIR'));

-- 3. Migrer les anciennes données
-- Chaque ligne existante devient 2 lignes : une MATIN et une SOIR
DO $$
DECLARE
  row_record RECORD;
BEGIN
  FOR row_record IN 
    SELECT * FROM fiches_transport_jours WHERE periode IS NULL
  LOOP
    -- Créer ligne MATIN (avec conducteur_aller)
    INSERT INTO fiches_transport_jours (
      fiche_transport_id, 
      date, 
      periode, 
      conducteur_aller_id, 
      conducteur_retour_id,
      immatriculation,
      created_at,
      updated_at
    ) VALUES (
      row_record.fiche_transport_id,
      row_record.date,
      'MATIN',
      row_record.conducteur_aller_id,
      NULL,
      row_record.immatriculation,
      row_record.created_at,
      now()
    );
    
    -- Créer ligne SOIR (avec conducteur_retour)
    INSERT INTO fiches_transport_jours (
      fiche_transport_id, 
      date, 
      periode, 
      conducteur_aller_id,
      conducteur_retour_id, 
      immatriculation,
      created_at,
      updated_at
    ) VALUES (
      row_record.fiche_transport_id,
      row_record.date,
      'SOIR',
      NULL,
      row_record.conducteur_retour_id,
      row_record.immatriculation,
      row_record.created_at,
      now()
    );
  END LOOP;
END $$;

-- 4. Supprimer les anciennes lignes (sans periode)
DELETE FROM fiches_transport_jours WHERE periode IS NULL;

-- 5. Rendre le champ obligatoire
ALTER TABLE fiches_transport_jours 
ALTER COLUMN periode SET NOT NULL;

-- 6. Créer une nouvelle contrainte unique sur (fiche_transport_id, date, periode, immatriculation)
-- Cela permet plusieurs véhicules par jour, mais un seul par (date, periode, immatriculation)
CREATE UNIQUE INDEX IF NOT EXISTS fiches_transport_jours_unique_vehicule_periode 
ON fiches_transport_jours(fiche_transport_id, date, periode, immatriculation);

-- 7. Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_fiches_transport_jours_date_periode 
ON fiches_transport_jours(fiche_transport_id, date, periode);

-- 8. Commentaire pour documentation
COMMENT ON COLUMN fiches_transport_jours.periode IS 
'Période de la journée : MATIN (conducteur aller) ou SOIR (conducteur retour). Permet de gérer plusieurs véhicules par jour.';