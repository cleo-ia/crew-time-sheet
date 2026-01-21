-- Supprimer la contrainte qui bloque le multi-chef
-- (empêche un employé d'avoir plusieurs fiches pour des chantiers différents la même semaine)
DROP INDEX IF EXISTS idx_fiches_unique_salarie_semaine;