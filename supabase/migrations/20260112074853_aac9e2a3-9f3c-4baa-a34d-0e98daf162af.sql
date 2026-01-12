-- Supprimer l'ancienne contrainte
ALTER TABLE rappels_historique DROP CONSTRAINT IF EXISTS rappels_historique_type_check;

-- Ajouter la nouvelle contrainte avec le type notify_conducteur
ALTER TABLE rappels_historique ADD CONSTRAINT rappels_historique_type_check 
CHECK (type IN ('rappel_chefs', 'rappel_conducteurs', 'notify_conducteur'));