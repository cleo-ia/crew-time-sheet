-- Supprimer l'affectation du chef Tom Genin au chantier "Construction Centre Commercial"
UPDATE chantiers 
SET chef_id = NULL, 
    updated_at = NOW()
WHERE id = 'c8b507d6-f1ae-4c13-aee9-e069aca0358c';