-- Rendre les colonnes nullable pour permettre la sauvegarde de brouillons incomplets
ALTER TABLE fiches_transport_jours
  ALTER COLUMN conducteur_aller_id DROP NOT NULL,
  ALTER COLUMN conducteur_retour_id DROP NOT NULL,
  ALTER COLUMN immatriculation DROP NOT NULL;