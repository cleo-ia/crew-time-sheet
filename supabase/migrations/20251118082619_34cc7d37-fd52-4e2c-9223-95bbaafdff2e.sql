-- Ajouter les colonnes marque et modele aux véhicules chefs/maçons
ALTER TABLE vehicules_chefs_macons 
ADD COLUMN IF NOT EXISTS marque TEXT,
ADD COLUMN IF NOT EXISTS modele TEXT;

-- Ajouter les colonnes marque et modele aux véhicules finisseurs
ALTER TABLE vehicules_finisseurs 
ADD COLUMN IF NOT EXISTS marque TEXT,
ADD COLUMN IF NOT EXISTS modele TEXT;