-- Add unite column to achats_chantier
ALTER TABLE public.achats_chantier
ADD COLUMN unite TEXT DEFAULT 'm2';