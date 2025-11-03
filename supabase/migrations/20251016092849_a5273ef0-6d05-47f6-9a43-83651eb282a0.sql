-- Création des tables pour la fiche transport
-- Table principale fiches_transport
CREATE TABLE public.fiches_transport (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiche_id UUID NOT NULL UNIQUE REFERENCES public.fiches(id) ON DELETE CASCADE,
  semaine TEXT NOT NULL,
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des jours de transport (5 jours par fiche)
CREATE TABLE public.fiches_transport_jours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiche_transport_id UUID NOT NULL REFERENCES public.fiches_transport(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  conducteur_aller_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE RESTRICT,
  conducteur_retour_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE RESTRICT,
  immatriculation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fiche_transport_id, date)
);

-- Indices pour optimiser les requêtes
CREATE INDEX idx_fiches_transport_fiche_id ON public.fiches_transport(fiche_id);
CREATE INDEX idx_fiches_transport_semaine ON public.fiches_transport(semaine);
CREATE INDEX idx_fiches_transport_jours_fiche_transport_id ON public.fiches_transport_jours(fiche_transport_id);
CREATE INDEX idx_fiches_transport_jours_date ON public.fiches_transport_jours(date);

-- Trigger pour updated_at sur fiches_transport
CREATE TRIGGER update_fiches_transport_updated_at
  BEFORE UPDATE ON public.fiches_transport
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour updated_at sur fiches_transport_jours
CREATE TRIGGER update_fiches_transport_jours_updated_at
  BEFORE UPDATE ON public.fiches_transport_jours
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies (accès ouvert pour développement)
ALTER TABLE public.fiches_transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiches_transport_jours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for development" ON public.fiches_transport
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for development" ON public.fiches_transport_jours
  FOR ALL USING (true) WITH CHECK (true);