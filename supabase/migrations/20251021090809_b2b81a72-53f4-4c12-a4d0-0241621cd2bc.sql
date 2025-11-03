-- 1. Nettoyer les doublons existants (conserver la plus récente pour chaque combinaison)
DELETE FROM fiches f1
WHERE EXISTS (
  SELECT 1 FROM fiches f2 
  WHERE f2.user_id = f1.user_id 
    AND f2.chantier_id = f1.chantier_id 
    AND f2.salarie_id = f1.salarie_id
    AND f2.semaine = f1.semaine 
    AND f2.created_at > f1.created_at
);

-- 2. Ajouter une contrainte unique pour empêcher les doublons futurs
ALTER TABLE fiches 
ADD CONSTRAINT unique_fiche_per_chef_chantier_salarie_semaine 
UNIQUE (user_id, chantier_id, salarie_id, semaine);