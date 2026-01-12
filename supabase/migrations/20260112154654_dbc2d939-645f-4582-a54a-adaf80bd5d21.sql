-- Ajouter la colonne site à la table demandes_conges
ALTER TABLE public.demandes_conges 
ADD COLUMN site TEXT DEFAULT 'Senozan';