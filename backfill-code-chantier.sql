-- Script de correction pour backfiller les code_chantier_du_jour et ville_du_jour manquants
-- Ce script met à jour tous les enregistrements de fiches_jours où code_chantier_du_jour est NULL
-- en récupérant le code chantier et la ville depuis la table chantiers via fiches.chantier_id

UPDATE fiches_jours fj
SET code_chantier_du_jour = c.code_chantier,
    ville_du_jour = COALESCE(fj.ville_du_jour, c.ville)
FROM fiches f
JOIN chantiers c ON c.id = f.chantier_id
WHERE fj.fiche_id = f.id
  AND fj.code_chantier_du_jour IS NULL
  AND f.chantier_id IS NOT NULL;
