-- Retirer la colonne immatriculation de fiches_transport_finisseurs (sera maintenant jour par jour)
ALTER TABLE fiches_transport_finisseurs DROP COLUMN IF EXISTS immatriculation;

-- Ajouter la colonne immatriculation dans fiches_transport_finisseurs_jours
ALTER TABLE fiches_transport_finisseurs_jours ADD COLUMN IF NOT EXISTS immatriculation text;