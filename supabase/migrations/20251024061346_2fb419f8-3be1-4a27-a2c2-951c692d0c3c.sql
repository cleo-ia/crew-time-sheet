-- Migration: Remplir code_chantier_du_jour et ville_du_jour manquants
-- Description: Corriger les entrées fiches_jours où code_chantier_du_jour est NULL
--              en utilisant les données du chantier parent

UPDATE fiches_jours fj
SET 
  code_chantier_du_jour = c.code_chantier,
  ville_du_jour = c.ville,
  updated_at = NOW()
FROM fiches f
JOIN chantiers c ON f.chantier_id = c.id
WHERE fj.fiche_id = f.id
  AND fj.code_chantier_du_jour IS NULL;