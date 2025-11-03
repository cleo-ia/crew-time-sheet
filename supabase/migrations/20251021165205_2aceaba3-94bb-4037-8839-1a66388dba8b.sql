-- Table pour lier les finisseurs aux conducteurs
CREATE TABLE public.affectations_finisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conducteur_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  finisseur_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policy
ALTER TABLE public.affectations_finisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" 
ON public.affectations_finisseurs 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger pour updated_at
CREATE TRIGGER update_affectations_finisseurs_updated_at
  BEFORE UPDATE ON public.affectations_finisseurs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour optimiser les requêtes
CREATE INDEX idx_affectations_finisseurs_conducteur ON public.affectations_finisseurs(conducteur_id);
CREATE INDEX idx_affectations_finisseurs_finisseur ON public.affectations_finisseurs(finisseur_id);
CREATE INDEX idx_affectations_finisseurs_actif ON public.affectations_finisseurs(conducteur_id, finisseur_id) WHERE date_fin IS NULL;