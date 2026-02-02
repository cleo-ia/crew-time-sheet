-- Supprimer l'ancienne contrainte
ALTER TABLE planning_affectations 
DROP CONSTRAINT IF EXISTS planning_affectations_employe_id_jour_entreprise_id_key;

-- Créer la nouvelle contrainte incluant chantier_id
ALTER TABLE planning_affectations 
ADD CONSTRAINT planning_affectations_unique_per_chantier 
UNIQUE (employe_id, jour, chantier_id, entreprise_id);