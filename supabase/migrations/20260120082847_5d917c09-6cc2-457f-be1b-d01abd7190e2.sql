-- Mise à jour des codes chantier courts vers le format complet
UPDATE fiches_jours fj
SET 
  code_chantier_du_jour = c.code_chantier,
  updated_at = NOW()
FROM chantiers c
WHERE 
  c.code_chantier LIKE fj.code_chantier_du_jour || '%'
  AND fj.code_chantier_du_jour IS NOT NULL
  AND fj.code_chantier_du_jour != c.code_chantier
  AND LENGTH(fj.code_chantier_du_jour) < LENGTH(c.code_chantier)