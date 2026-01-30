-- ============================================================================
-- MIGRATION: Ajout chantier_principal_id pour chefs multi-chantiers
-- ============================================================================
-- Permet de définir le chantier principal d'un chef pour éviter les doublons d'heures

-- 1. Ajouter la colonne
ALTER TABLE utilisateurs
ADD COLUMN IF NOT EXISTS chantier_principal_id UUID REFERENCES chantiers(id) ON DELETE SET NULL;

-- 2. Commenter la colonne
COMMENT ON COLUMN utilisateurs.chantier_principal_id IS 
  'Chantier principal du chef. Ses heures personnelles sont comptées uniquement sur ce chantier.';

-- 3. Initialiser pour les chefs existants (premier chantier actif trouvé par ordre de création)
UPDATE utilisateurs u
SET chantier_principal_id = (
  SELECT c.id 
  FROM chantiers c 
  WHERE c.chef_id = u.id AND c.actif = true
  ORDER BY c.created_at ASC
  LIMIT 1
)
WHERE u.id IN (
  SELECT DISTINCT chef_id FROM chantiers WHERE chef_id IS NOT NULL AND actif = true
);

-- 4. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_utilisateurs_chantier_principal ON utilisateurs(chantier_principal_id);