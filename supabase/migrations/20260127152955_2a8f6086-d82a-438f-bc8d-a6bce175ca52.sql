-- Mettre à jour tous les intérimaires existants avec role_metier = 'interimaire'
UPDATE utilisateurs 
SET role_metier = 'interimaire', updated_at = now()
WHERE agence_interim IS NOT NULL 
  AND agence_interim != ''
  AND (role_metier IS NULL OR role_metier != 'interimaire');