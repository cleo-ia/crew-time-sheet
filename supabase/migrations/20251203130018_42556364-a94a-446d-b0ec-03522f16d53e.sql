-- Add parent_id column to support nested folders
ALTER TABLE public.chantiers_dossiers 
ADD COLUMN parent_id uuid REFERENCES public.chantiers_dossiers(id) ON DELETE CASCADE;

-- Create index for better performance on parent_id lookups
CREATE INDEX idx_chantiers_dossiers_parent_id ON public.chantiers_dossiers(parent_id);