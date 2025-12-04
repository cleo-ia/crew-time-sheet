-- Add montant_vendu column to chantiers table
ALTER TABLE public.chantiers
ADD COLUMN montant_vendu numeric DEFAULT 0;