-- Ajouter le nombre de personnes par jour et par type de tâche
ALTER TABLE ratios_journaliers 
ADD COLUMN nb_personnes_beton integer,
ADD COLUMN nb_personnes_voile integer,
ADD COLUMN nb_personnes_coffrage integer;