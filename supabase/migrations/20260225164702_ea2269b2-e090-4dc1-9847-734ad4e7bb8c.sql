
-- Table pour gérer les absences longue durée (AT, AM, congé parental, etc.)
CREATE TABLE public.absences_longue_duree (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salarie_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id),
  type_absence public.type_absence NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE,
  motif TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche rapide par entreprise et dates actives
CREATE INDEX idx_absences_longue_duree_entreprise ON public.absences_longue_duree(entreprise_id);
CREATE INDEX idx_absences_longue_duree_active ON public.absences_longue_duree(entreprise_id, date_debut, date_fin);

-- Trigger updated_at
CREATE TRIGGER update_absences_longue_duree_updated_at
  BEFORE UPDATE ON public.absences_longue_duree
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.absences_longue_duree ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view absences_longue_duree of their company"
  ON public.absences_longue_duree
  FOR SELECT
  USING (entreprise_id = get_selected_entreprise_id());

CREATE POLICY "RH and Admin can insert absences_longue_duree"
  ON public.absences_longue_duree
  FOR INSERT
  WITH CHECK (
    entreprise_id = get_selected_entreprise_id()
    AND (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "RH and Admin can update absences_longue_duree"
  ON public.absences_longue_duree
  FOR UPDATE
  USING (
    entreprise_id = get_selected_entreprise_id()
    AND (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "RH and Admin can delete absences_longue_duree"
  ON public.absences_longue_duree
  FOR DELETE
  USING (
    entreprise_id = get_selected_entreprise_id()
    AND (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );
