-- Nettoyage des fiches_jours fantômes pour les employés avec affectations partielles
-- Protège les données legacy (employés sans aucune affectation)

DELETE FROM fiches_jours fj
USING fiches f
WHERE fj.fiche_id = f.id
  AND f.chantier_id IS NOT NULL  -- Maçons uniquement (pas finisseurs)
  -- L'employé a AU MOINS UNE affectation cette semaine pour ce chef
  -- (protège les données legacy sans affectations)
  AND EXISTS (
    SELECT 1 FROM affectations_jours_chef ajc2
    WHERE ajc2.macon_id = f.salarie_id 
      AND ajc2.semaine = f.semaine
      AND ajc2.chef_id = f.user_id
  )
  -- Mais ce jour spécifique n'a PAS d'affectation
  AND NOT EXISTS (
    SELECT 1 FROM affectations_jours_chef ajc
    WHERE ajc.macon_id = f.salarie_id
      AND ajc.jour = fj.date
      AND ajc.chef_id = f.user_id
  );

-- Note: Le trigger trg_recalc_fiche_on_fj recalcule automatiquement total_heures