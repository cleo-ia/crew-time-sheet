
-- Supprimer les fiches_jours liées aux fiches orphelines BROUILLON
DELETE FROM fiches_jours 
WHERE fiche_id IN (
  SELECT id FROM fiches 
  WHERE entreprise_id = (SELECT id FROM entreprises WHERE slug = 'sder')
    AND statut = 'BROUILLON'
    AND chantier_id IS NULL
);

-- Supprimer les fiches orphelines BROUILLON sans chantier_id
DELETE FROM fiches 
WHERE entreprise_id = (SELECT id FROM entreprises WHERE slug = 'sder')
  AND statut = 'BROUILLON'
  AND chantier_id IS NULL;
