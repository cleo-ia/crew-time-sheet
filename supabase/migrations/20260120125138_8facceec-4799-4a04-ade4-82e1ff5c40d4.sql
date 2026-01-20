-- =====================================================
-- Table: affectations_jours_chef
-- Permet aux chefs de chantier de spécifier les jours
-- où un employé travaille sur leur chantier
-- =====================================================

CREATE TABLE public.affectations_jours_chef (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affectation_id UUID REFERENCES public.affectations(id) ON DELETE CASCADE,
  macon_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES public.utilisateurs(id),
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  jour DATE NOT NULL,
  semaine TEXT NOT NULL,
  entreprise_id UUID REFERENCES public.entreprises(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un employé ne peut être assigné qu'à UN SEUL chantier par jour
  UNIQUE(macon_id, jour)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_affectations_jours_chef_semaine ON public.affectations_jours_chef(semaine);
CREATE INDEX idx_affectations_jours_chef_macon ON public.affectations_jours_chef(macon_id, semaine);
CREATE INDEX idx_affectations_jours_chef_chef ON public.affectations_jours_chef(chef_id, semaine);
CREATE INDEX idx_affectations_jours_chef_chantier ON public.affectations_jours_chef(chantier_id, semaine);

-- Enable Row Level Security
ALTER TABLE public.affectations_jours_chef ENABLE ROW LEVEL SECURITY;

-- Policies pour la sécurité par entreprise
CREATE POLICY "Users can view affectations_jours_chef in their entreprise"
  ON public.affectations_jours_chef FOR SELECT
  USING (entreprise_id = public.get_user_entreprise_id());

CREATE POLICY "Users can insert affectations_jours_chef in their entreprise"
  ON public.affectations_jours_chef FOR INSERT
  WITH CHECK (entreprise_id = public.get_user_entreprise_id());

CREATE POLICY "Users can update affectations_jours_chef in their entreprise"
  ON public.affectations_jours_chef FOR UPDATE
  USING (entreprise_id = public.get_user_entreprise_id());

CREATE POLICY "Users can delete affectations_jours_chef in their entreprise"
  ON public.affectations_jours_chef FOR DELETE
  USING (entreprise_id = public.get_user_entreprise_id());

-- Trigger pour la mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION public.update_affectations_jours_chef_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_affectations_jours_chef_updated_at
  BEFORE UPDATE ON public.affectations_jours_chef
  FOR EACH ROW
  EXECUTE FUNCTION public.update_affectations_jours_chef_updated_at();