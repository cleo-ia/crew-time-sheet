-- Créer l'enum pour le type de repas
CREATE TYPE repas_type AS ENUM ('PANIER', 'RESTO');

-- Ajouter la colonne à fiches_jours (nullable = rien)
ALTER TABLE fiches_jours ADD COLUMN repas_type repas_type DEFAULT NULL;

-- Migrer les données existantes : "PA"=true → 'PANIER'
UPDATE fiches_jours SET repas_type = 'PANIER' WHERE "PA" = true;