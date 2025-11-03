-- Ajout des tables manquantes et relations pour les affectations

-- Table pour gérer les affectations de maçons à des chefs/chantiers avec période
CREATE TABLE IF NOT EXISTS public.affectations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  macon_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_dates CHECK (date_fin IS NULL OR date_fin >= date_debut)
);

-- Enable RLS
ALTER TABLE public.affectations ENABLE ROW LEVEL SECURITY;

-- Policies for affectations
CREATE POLICY "affectations_select_all"
  ON public.affectations
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'conducteur'::app_role) OR
    has_role(auth.uid(), 'chef'::app_role) OR
    macon_id = auth.uid()
  );

CREATE POLICY "affectations_insert_admin"
  ON public.affectations
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "affectations_update_admin"
  ON public.affectations
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "affectations_delete_admin"
  ON public.affectations
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_affectations_updated_at
  BEFORE UPDATE ON public.affectations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour optimiser les requêtes
CREATE INDEX idx_affectations_macon ON public.affectations(macon_id);
CREATE INDEX idx_affectations_chef ON public.affectations(chef_id);
CREATE INDEX idx_affectations_chantier ON public.affectations(chantier_id);
CREATE INDEX idx_affectations_dates ON public.affectations(date_debut, date_fin);

-- Ajout de libelle sur chantiers si pas déjà présent (pour compatibilité)
ALTER TABLE public.chantiers 
  ALTER COLUMN libelle DROP NOT NULL;

-- Vue pour faciliter les requêtes avec les noms complets
CREATE OR REPLACE VIEW public.affectations_view AS
SELECT 
  a.id,
  a.macon_id,
  m.nom || ' ' || m.prenom as macon_nom,
  m.email as macon_email,
  a.chef_id,
  c.nom || ' ' || c.prenom as chef_nom,
  a.chantier_id,
  ch.nom as chantier_nom,
  ch.code_chantier,
  ch.ville,
  a.date_debut,
  a.date_fin,
  a.created_at,
  a.updated_at
FROM public.affectations a
JOIN public.utilisateurs m ON a.macon_id = m.id
JOIN public.utilisateurs c ON a.chef_id = c.id
JOIN public.chantiers ch ON a.chantier_id = ch.id;