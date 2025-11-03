
-- ============================================================================
-- NETTOYAGE ET CRÉATION DES DONNÉES DE TEST POUR LES RAPPELS
-- ============================================================================

-- 1. Nettoyer les fiches existantes de cette semaine
DELETE FROM fiches 
WHERE semaine = TO_CHAR(CURRENT_DATE, 'IYYY-"S"IW');

-- 2. Assigner Tom Genin (chef) et le conducteur aux chantiers
UPDATE chantiers 
SET 
  chef_id = '763f030a-23ae-4355-9a0c-1fc715a9ea70',
  conducteur_id = 'b9061529-3125-420a-a6e8-689a2e5cf287',
  updated_at = NOW()
WHERE id IN ('f19a2bf0-c513-4f49-a0e5-1faa45170a94', 'c8b507d6-f1ae-4c13-aee9-e069aca0358c');

-- 3. TEST RAPPEL CHEFS (17h) - Tom a 2 fiches non finalisées
-- Fiche 1: Tom BROUILLON sur CH-001
INSERT INTO fiches (
  chantier_id, user_id, salarie_id, semaine, statut, total_heures
) VALUES (
  'f19a2bf0-c513-4f49-a0e5-1faa45170a94',
  '763f030a-23ae-4355-9a0c-1fc715a9ea70',
  '763f030a-23ae-4355-9a0c-1fc715a9ea70',
  TO_CHAR(CURRENT_DATE, 'IYYY-"S"IW'),
  'BROUILLON',
  0
);

-- Fiche 2: Tom EN_SIGNATURE sur CH-002
INSERT INTO fiches (
  chantier_id, user_id, salarie_id, semaine, statut, total_heures
) VALUES (
  'c8b507d6-f1ae-4c13-aee9-e069aca0358c',
  '763f030a-23ae-4355-9a0c-1fc715a9ea70',
  '763f030a-23ae-4355-9a0c-1fc715a9ea70',
  TO_CHAR(CURRENT_DATE, 'IYYY-"S"IW'),
  'EN_SIGNATURE',
  0
);

-- 4. TEST RAPPEL CONDUCTEURS (14h) - Fiches validées par chef
-- Fiche 3: Theo VALIDE_CHEF sur CH-001
INSERT INTO fiches (
  chantier_id, user_id, salarie_id, semaine, statut, total_heures
) VALUES (
  'f19a2bf0-c513-4f49-a0e5-1faa45170a94',
  '763f030a-23ae-4355-9a0c-1fc715a9ea70',
  'a3e6608f-cf9a-466d-bbe9-86da4184a667',
  TO_CHAR(CURRENT_DATE, 'IYYY-"S"IW'),
  'VALIDE_CHEF',
  35.5
);

-- Fiche 4: Conducteur VALIDE_CHEF sur CH-002
INSERT INTO fiches (
  chantier_id, user_id, salarie_id, semaine, statut, total_heures
) VALUES (
  'c8b507d6-f1ae-4c13-aee9-e069aca0358c',
  '763f030a-23ae-4355-9a0c-1fc715a9ea70',
  'b9061529-3125-420a-a6e8-689a2e5cf287',
  TO_CHAR(CURRENT_DATE, 'IYYY-"S"IW'),
  'VALIDE_CHEF',
  42.0
);
