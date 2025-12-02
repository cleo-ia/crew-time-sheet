-- Create enum for task status
CREATE TYPE public.statut_tache AS ENUM ('A_FAIRE', 'EN_COURS', 'TERMINE', 'EN_RETARD');

-- Create taches_chantier table
CREATE TABLE public.taches_chantier (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  heures_estimees INTEGER,
  heures_realisees INTEGER DEFAULT 0,
  statut statut_tache NOT NULL DEFAULT 'A_FAIRE',
  ordre INTEGER NOT NULL DEFAULT 0,
  couleur TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.taches_chantier ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users
CREATE POLICY "Allow all access for authenticated users"
ON public.taches_chantier
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster queries by chantier
CREATE INDEX idx_taches_chantier_chantier_id ON public.taches_chantier(chantier_id);

-- Create trigger for updated_at
CREATE TRIGGER update_taches_chantier_updated_at
  BEFORE UPDATE ON public.taches_chantier
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraint: date_fin must be >= date_debut
ALTER TABLE public.taches_chantier
ADD CONSTRAINT taches_chantier_dates_check CHECK (date_fin >= date_debut);