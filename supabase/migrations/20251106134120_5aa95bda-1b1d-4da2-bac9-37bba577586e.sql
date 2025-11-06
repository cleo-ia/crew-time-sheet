-- Ajouter la colonne libelle_emploi à la table utilisateurs
ALTER TABLE public.utilisateurs 
ADD COLUMN libelle_emploi text;