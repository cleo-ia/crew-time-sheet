-- Supprimer l'ancienne contrainte qui bloque les chefs multi-chantiers
ALTER TABLE planning_affectations 
DROP CONSTRAINT IF EXISTS unique_employe_jour_entreprise;