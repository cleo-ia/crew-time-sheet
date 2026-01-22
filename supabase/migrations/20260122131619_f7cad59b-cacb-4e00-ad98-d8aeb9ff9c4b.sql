-- Retirer le chef du chantier CI235 pour tester le flux conducteur seul
UPDATE chantiers 
SET chef_id = NULL, updated_at = NOW()
WHERE code_chantier = 'CI235' 
  AND entreprise_id = '6ac82b13-1a83-4bc8-8f65-23f57ef2e98a';