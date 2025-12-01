
-- PARTIE 1 : Nettoyage des doublons (garder la fiche avec updated_at le plus récent)

-- Supprimer les fiches en doublon en gardant celle avec updated_at le plus récent
WITH fiches_a_garder AS (
  SELECT DISTINCT ON (salarie_id, semaine)
    id,
    salarie_id,
    semaine,
    updated_at
  FROM fiches
  WHERE salarie_id IS NOT NULL 
    AND chantier_id IS NOT NULL
  ORDER BY salarie_id, semaine, updated_at DESC
),
fiches_a_supprimer AS (
  SELECT f.id
  FROM fiches f
  WHERE f.salarie_id IS NOT NULL 
    AND f.chantier_id IS NOT NULL
    AND f.id NOT IN (SELECT id FROM fiches_a_garder)
    AND EXISTS (
      -- Vérifier qu'il y a bien un doublon
      SELECT 1 
      FROM fiches f2 
      WHERE f2.salarie_id = f.salarie_id 
        AND f2.semaine = f.semaine 
        AND f2.id != f.id
        AND f2.salarie_id IS NOT NULL
        AND f2.chantier_id IS NOT NULL
    )
)
DELETE FROM fiches
WHERE id IN (SELECT id FROM fiches_a_supprimer);

-- PARTIE 2 : Création de la contrainte d'unicité pour empêcher les doublons futurs
-- Un employé ne peut avoir qu'une seule fiche par semaine (tous chantiers confondus)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fiches_unique_salarie_semaine 
ON fiches (salarie_id, semaine) 
WHERE salarie_id IS NOT NULL AND chantier_id IS NOT NULL;

-- Commentaire pour documenter la contrainte
COMMENT ON INDEX idx_fiches_unique_salarie_semaine IS 
'Empêche un employé d''avoir plusieurs fiches pour une même semaine. Le chantier peut varier jour par jour via code_chantier_du_jour dans fiches_jours.';
