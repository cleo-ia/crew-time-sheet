-- Add montant_vendu column to taches_chantier table
ALTER TABLE public.taches_chantier
ADD COLUMN montant_vendu numeric DEFAULT 0;