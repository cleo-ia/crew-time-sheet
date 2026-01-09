-- Purge complète de la semaine 2026-S02
-- Ordre de suppression respectant les contraintes FK

-- 1. Supprimer affectations_finisseurs_jours
DELETE FROM affectations_finisseurs_jours WHERE semaine = '2026-S02';

-- 2. Supprimer signatures liées aux fiches S02
DELETE FROM signatures WHERE fiche_id IN (
  SELECT id FROM fiches WHERE semaine = '2026-S02'
);

-- 3. Supprimer fiches_transport_finisseurs_jours
DELETE FROM fiches_transport_finisseurs_jours WHERE fiche_transport_finisseur_id IN (
  SELECT id FROM fiches_transport_finisseurs WHERE semaine = '2026-S02'
);

-- 4. Supprimer fiches_transport_finisseurs
DELETE FROM fiches_transport_finisseurs WHERE semaine = '2026-S02';

-- 5. Supprimer fiches_transport_jours
DELETE FROM fiches_transport_jours WHERE fiche_transport_id IN (
  SELECT id FROM fiches_transport WHERE semaine = '2026-S02'
);

-- 6. Supprimer fiches_transport
DELETE FROM fiches_transport WHERE semaine = '2026-S02';

-- 7. Supprimer fiches_jours
DELETE FROM fiches_jours WHERE fiche_id IN (
  SELECT id FROM fiches WHERE semaine = '2026-S02'
);

-- 8. Supprimer fiches
DELETE FROM fiches WHERE semaine = '2026-S02';