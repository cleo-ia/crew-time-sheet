-- Ajouter la colonne taux_horaire à la table utilisateurs
ALTER TABLE public.utilisateurs 
ADD COLUMN taux_horaire numeric(10,2);