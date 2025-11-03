-- Suppression des données de test pour la semaine 2025-S42
-- Ordre de suppression respectant les contraintes de foreign keys

-- 1. Supprimer fiches_transport_jours
DELETE FROM fiches_transport_jours ftj
WHERE ftj.fiche_transport_id IN (
  SELECT ft.id FROM fiches_transport ft
  INNER JOIN fiches f ON ft.fiche_id = f.id
  WHERE f.semaine = '2025-S42'
);

-- 2. Supprimer fiches_transport
DELETE FROM fiches_transport ft
WHERE ft.fiche_id IN (
  SELECT id FROM fiches WHERE semaine = '2025-S42'
);

-- 3. Supprimer signatures
DELETE FROM signatures s
WHERE s.fiche_id IN (
  SELECT id FROM fiches WHERE semaine = '2025-S42'
);

-- 4. Supprimer fiches_jours
DELETE FROM fiches_jours fj
WHERE fj.fiche_id IN (
  SELECT id FROM fiches WHERE semaine = '2025-S42'
);

-- 5. Supprimer fiches
DELETE FROM fiches WHERE semaine = '2025-S42';