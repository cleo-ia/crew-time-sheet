-- Create folders table for chantier documents
CREATE TABLE public.chantiers_dossiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder reference to documents
ALTER TABLE public.chantiers_documents
ADD COLUMN dossier_id UUID REFERENCES public.chantiers_dossiers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.chantiers_dossiers ENABLE ROW LEVEL SECURITY;

-- RLS policies for folders (same as documents)
CREATE POLICY "Authenticated users can view folders"
ON public.chantiers_dossiers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create folders"
ON public.chantiers_dossiers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update folders"
ON public.chantiers_dossiers FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete folders"
ON public.chantiers_dossiers FOR DELETE
TO authenticated
USING (true);

-- Index for faster queries
CREATE INDEX idx_chantiers_dossiers_chantier_id ON public.chantiers_dossiers(chantier_id);
CREATE INDEX idx_chantiers_documents_dossier_id ON public.chantiers_documents(dossier_id);