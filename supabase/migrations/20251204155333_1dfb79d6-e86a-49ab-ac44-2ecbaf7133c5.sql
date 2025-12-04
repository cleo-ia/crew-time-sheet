-- Add quantity and unit price columns to achats_chantier
ALTER TABLE public.achats_chantier 
ADD COLUMN IF NOT EXISTS quantite numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS prix_unitaire numeric;