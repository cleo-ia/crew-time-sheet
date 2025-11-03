-- Permettre chantier_id NULL dans fiches_transport pour les conducteurs
-- Cela permet aux conducteurs de sauvegarder leurs trajets sans être assignés à un chantier spécifique

ALTER TABLE public.fiches_transport 
ALTER COLUMN chantier_id DROP NOT NULL;