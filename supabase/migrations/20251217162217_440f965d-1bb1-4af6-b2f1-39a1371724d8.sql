-- Table pour l'historique des modifications des fiches
CREATE TABLE public.fiches_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_id UUID REFERENCES public.fiches(id) ON DELETE CASCADE,
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id),
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'creation', 'modification_heures', 'modification_statut', 'signature', 'transmission', 'modification_trajet'
  champ_modifie TEXT,
  ancienne_valeur TEXT,
  nouvelle_valeur TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_fiches_modifications_entreprise_id ON public.fiches_modifications(entreprise_id);
CREATE INDEX idx_fiches_modifications_created_at ON public.fiches_modifications(created_at DESC);
CREATE INDEX idx_fiches_modifications_fiche_id ON public.fiches_modifications(fiche_id);

-- Enable RLS
ALTER TABLE public.fiches_modifications ENABLE ROW LEVEL SECURITY;

-- Policy: RH et Admin peuvent lire les modifications de leur entreprise
CREATE POLICY "RH and Admin can view modifications of their enterprise"
ON public.fiches_modifications
FOR SELECT
USING (
  user_has_access_to_entreprise(entreprise_id) 
  AND (has_role(auth.uid(), 'rh') OR has_role(auth.uid(), 'admin'))
);

-- Policy: Authenticated users can insert modifications for their enterprise
CREATE POLICY "Authenticated users can insert modifications"
ON public.fiches_modifications
FOR INSERT
WITH CHECK (user_has_access_to_entreprise(entreprise_id));