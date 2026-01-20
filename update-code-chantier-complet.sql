-- Script pour mettre à jour les codes chantier courts vers le format complet
-- Ex: CI893 → CI893OLYMPIA, CI889 → CI889DAVOULT

-- 1. Prévisualisation des modifications
SELECT 
  fj.code_chantier_du_jour AS ancien_code,
  c.code_chantier AS nouveau_code,
  COUNT(*) AS nb_lignes
FROM fiches_jours fj
JOIN chantiers c ON c.code_chantier LIKE fj.code_chantier_du_jour || '%'
WHERE 
  fj.code_chantier_du_jour IS NOT NULL
  AND fj.code_chantier_du_jour != c.code_chantier
  AND LENGTH(fj.code_chantier_du_jour) < LENGTH(c.code_chantier)
GROUP BY fj.code_chantier_du_jour, c.code_chantier
ORDER BY fj.code_chantier_du_jour;

-- 2. Appliquer la mise à jour
UPDATE fiches_jours fj
SET 
  code_chantier_du_jour = c.code_chantier,
  updated_at = NOW()
FROM chantiers c
WHERE 
  c.code_chantier LIKE fj.code_chantier_du_jour || '%'
  AND fj.code_chantier_du_jour IS NOT NULL
  AND fj.code_chantier_du_jour != c.code_chantier
  AND LENGTH(fj.code_chantier_du_jour) < LENGTH(c.code_chantier);
