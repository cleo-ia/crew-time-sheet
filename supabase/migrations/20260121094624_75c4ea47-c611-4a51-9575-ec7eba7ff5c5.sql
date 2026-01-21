-- Table pour stocker les affectations du planning S+1
CREATE TABLE planning_affectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  chantier_id UUID NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  jour DATE NOT NULL,
  semaine TEXT NOT NULL,  -- format "2026-S05"
  vehicule_id UUID REFERENCES vehicules(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Un employé ne peut être affecté qu'à un seul chantier par jour
  CONSTRAINT unique_employe_jour_entreprise 
    UNIQUE(employe_id, jour, entreprise_id)
);

-- Index pour les performances
CREATE INDEX idx_planning_affectations_semaine ON planning_affectations(semaine, entreprise_id);
CREATE INDEX idx_planning_affectations_chantier ON planning_affectations(chantier_id, semaine);
CREATE INDEX idx_planning_affectations_employe ON planning_affectations(employe_id, semaine);

-- Activer RLS
ALTER TABLE planning_affectations ENABLE ROW LEVEL SECURITY;

-- Politique : accès selon l'entreprise
CREATE POLICY "Users can view planning of their entreprise" 
ON planning_affectations FOR SELECT 
USING (user_has_access_to_entreprise(entreprise_id));

CREATE POLICY "Users can insert planning in their entreprise" 
ON planning_affectations FOR INSERT 
WITH CHECK (user_has_access_to_entreprise(entreprise_id));

CREATE POLICY "Users can update planning in their entreprise" 
ON planning_affectations FOR UPDATE 
USING (user_has_access_to_entreprise(entreprise_id));

CREATE POLICY "Users can delete planning in their entreprise" 
ON planning_affectations FOR DELETE 
USING (user_has_access_to_entreprise(entreprise_id));

-- Ajouter le champ adresse_domicile sur utilisateurs
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS adresse_domicile TEXT;