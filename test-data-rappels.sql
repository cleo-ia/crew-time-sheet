-- Script de création de données de test pour les rappels automatiques
-- À exécuter dans l'éditeur SQL de Supabase

-- ============================================================================
-- DONNÉES DE TEST POUR LES RAPPELS
-- ============================================================================

-- Variables utilisées (basées sur les données existantes) :
-- Chef : Tom Genin - tom.genin@groupe-engo.com (763f030a-23ae-4355-9a0c-1fc715a9ea70)
-- Conducteur : comptalr@groupe-engo.com (b9061529-3125-420a-a6e8-689a2e5cf287)
-- Chantier 1 : CH-001 Réno école Saint-Denis (f19a2bf0-c513-4f49-a0e5-1faa45170a94)
-- Chantier 2 : CH-002 Construction Centre Commercial (c8b507d6-f1ae-4c13-aee9-e069aca0358c)

-- ============================================================================
-- 1. MISE À JOUR DES CHANTIERS (assigner chef et conducteur)
-- ============================================================================

UPDATE chantiers 
SET 
  chef_id = '763f030a-23ae-4355-9a0c-1fc715a9ea70',
  conducteur_id = 'b9061529-3125-420a-a6e8-689a2e5cf287'
WHERE id IN ('f19a2bf0-c513-4f49-a0e5-1faa45170a94', 'c8b507d6-f1ae-4c13-aee9-e069aca0358c');

-- ============================================================================
-- 2. TEST RAPPEL CHEFS (17h00) - Fiches en BROUILLON
-- ============================================================================

-- Fiche 1 : BROUILLON pour tester le rappel chef
INSERT INTO fiches (
  id,
  chantier_id,
  user_id,
  salarie_id,
  semaine,
  statut,
  total_heures,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'f19a2bf0-c513-4f49-a0e5-1faa45170a94', -- Chantier CH-001
  '763f030a-23ae-4355-9a0c-1fc715a9ea70', -- Chef Tom Genin
  '763f030a-23ae-4355-9a0c-1fc715a9ea70', -- Salarié Tom Genin
  TO_CHAR(CURRENT_DATE, 'IYYY-"S"IW'),    -- Semaine actuelle (format: 2025-S43)
  'BROUILLON',
  0,
  NOW(),
  NOW()
);

-- Fiche 2 : EN_SIGNATURE pour tester le rappel chef
INSERT INTO fiches (
  id,
  chantier_id,
  user_id,
  salarie_id,
  semaine,
  statut,
  total_heures,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'c8b507d6-f1ae-4c13-aee9-e069aca0358c', -- Chantier CH-002
  '763f030a-23ae-4355-9a0c-1fc715a9ea70', -- Chef Tom Genin
  'b9061529-3125-420a-a6e8-689a2e5cf287', -- Salarié conducteur
  TO_CHAR(CURRENT_DATE, 'IYYY-"S"IW'),    -- Semaine actuelle (format: 2025-S43)
  'EN_SIGNATURE',
  0,
  NOW(),
  NOW()
);

-- ============================================================================
-- 3. TEST RAPPEL CONDUCTEURS (14h00) - Fiches VALIDE_CHEF
-- ============================================================================

-- Fiche 3 : VALIDE_CHEF pour tester le rappel conducteur
INSERT INTO fiches (
  id,
  chantier_id,
  user_id,
  salarie_id,
  semaine,
  statut,
  total_heures,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'f19a2bf0-c513-4f49-a0e5-1faa45170a94', -- Chantier CH-001
  '763f030a-23ae-4355-9a0c-1fc715a9ea70', -- Chef Tom Genin
  '763f030a-23ae-4355-9a0c-1fc715a9ea70', -- Salarié Tom Genin
  TO_CHAR(CURRENT_DATE, 'IYYY-"S"IW'),    -- Semaine actuelle (format: 2025-S43)
  'VALIDE_CHEF',
  35.5,
  NOW(),
  NOW()
);

-- Fiche 4 : VALIDE_CHEF pour tester le rappel conducteur
INSERT INTO fiches (
  id,
  chantier_id,
  user_id,
  salarie_id,
  semaine,
  statut,
  total_heures,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'c8b507d6-f1ae-4c13-aee9-e069aca0358c', -- Chantier CH-002
  '763f030a-23ae-4355-9a0c-1fc715a9ea70', -- Chef Tom Genin
  'b9061529-3125-420a-a6e8-689a2e5cf287', -- Salarié conducteur
  TO_CHAR(CURRENT_DATE, 'IYYY-"S"IW'),    -- Semaine actuelle (format: 2025-S43)
  'VALIDE_CHEF',
  42.0,
  NOW(),
  NOW()
);

-- ============================================================================
-- 4. VÉRIFICATION DES DONNÉES CRÉÉES
-- ============================================================================

-- Afficher toutes les fiches de test créées
SELECT 
  f.id,
  f.semaine,
  f.statut,
  f.total_heures,
  c.nom as chantier,
  c.code_chantier,
  u.prenom || ' ' || u.nom as chef,
  s.prenom || ' ' || s.nom as salarie
FROM fiches f
LEFT JOIN chantiers c ON f.chantier_id = c.id
LEFT JOIN utilisateurs u ON f.user_id = u.id
LEFT JOIN utilisateurs s ON f.salarie_id = s.id
WHERE f.semaine = TO_CHAR(CURRENT_DATE, 'IYYY-"S"IW')
ORDER BY f.statut, f.created_at DESC;

-- ============================================================================
-- INSTRUCTIONS DE TEST
-- ============================================================================

/*

✅ DONNÉES CRÉÉES :

1. **2 fiches BROUILLON/EN_SIGNATURE** 
   → Déclenchera le "Rappel Chefs" à 17h00 (heure de Paris)
   → Tom Genin recevra un email lui demandant de finaliser ses fiches

2. **2 fiches VALIDE_CHEF**
   → Déclenchera le "Rappel Conducteurs" à 14h00 (heure de Paris)
   → Le conducteur (comptalr@groupe-engo.com) recevra un email pour valider

📋 COMMENT TESTER :

Option A - Test manuel immédiat :
1. Aller dans Admin Panel > Onglet "Rappels"
2. Cliquer sur "Exécuter maintenant" pour Rappel Chefs
3. Cliquer sur "Exécuter maintenant" pour Rappel Conducteurs
4. Vérifier les logs Supabase pour voir les webhooks envoyés
5. Vérifier dans n8n que les workflows se sont exécutés

Option B - Test automatique :
1. Attendre 14h00 (heure de Paris) pour le rappel conducteurs
2. Attendre 17h00 (heure de Paris) pour le rappel chefs
3. Vérifier les emails reçus
4. Consulter l'historique dans Admin Panel > Rappels

🔍 VÉRIFICATION :

-- Compter les fiches par statut pour la semaine actuelle
SELECT 
  statut,
  COUNT(*) as nombre
FROM fiches
WHERE semaine = TO_CHAR(CURRENT_DATE, 'IYYY-"S"IW')
GROUP BY statut;

-- Voir les chantiers avec chef et conducteur assignés
SELECT 
  c.nom,
  c.code_chantier,
  chef.prenom || ' ' || chef.nom as chef,
  cond.email as conducteur
FROM chantiers c
LEFT JOIN utilisateurs chef ON c.chef_id = chef.id
LEFT JOIN utilisateurs cond ON c.conducteur_id = cond.id
WHERE c.actif = true;

🧹 NETTOYAGE (après les tests) :

-- Supprimer toutes les fiches de test de la semaine actuelle
DELETE FROM fiches 
WHERE semaine = TO_CHAR(CURRENT_DATE, 'IYYY-"S"IW');

*/
