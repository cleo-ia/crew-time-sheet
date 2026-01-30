-- ============================================================================
-- SCRIPT DE NETTOYAGE DES DOUBLONS - Chefs Multi-Chantiers
-- ============================================================================
-- Ce script supprime les fiches secondaires des chefs qui ont un chantier
-- principal défini, pour éliminer les doublons d'heures.
-- 
-- Exécution : Copier-coller dans l'éditeur SQL de Supabase (Cloud View > Run SQL)
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Vérifier les chefs avec chantier principal défini
-- ============================================================================
SELECT 
  u.id as chef_id,
  u.nom,
  u.prenom,
  u.chantier_principal_id,
  c.nom as chantier_principal_nom,
  c.code_chantier
FROM utilisateurs u
INNER JOIN chantiers c ON c.id = u.chantier_principal_id
WHERE u.chantier_principal_id IS NOT NULL;

-- ============================================================================
-- ÉTAPE 2 : Identifier les fiches en doublon à supprimer
-- ============================================================================
-- Fiches des chefs sur des chantiers SECONDAIRES (pas leur chantier principal)
WITH chefs_principaux AS (
  SELECT 
    u.id as chef_id,
    u.nom,
    u.prenom,
    u.chantier_principal_id,
    c.nom as chantier_principal_nom
  FROM utilisateurs u
  INNER JOIN chantiers c ON c.id = u.chantier_principal_id
  WHERE u.chantier_principal_id IS NOT NULL
)
SELECT 
  f.id as fiche_id,
  cp.nom || ' ' || cp.prenom as chef_nom,
  f.semaine,
  f.statut,
  c.nom as chantier_fiche,
  c.code_chantier,
  cp.chantier_principal_nom,
  f.total_heures,
  'DELETE' as action
FROM fiches f
INNER JOIN chefs_principaux cp ON f.salarie_id = cp.chef_id
INNER JOIN chantiers c ON f.chantier_id = c.id
WHERE f.chantier_id != cp.chantier_principal_id
ORDER BY cp.nom, f.semaine, c.nom;

-- ============================================================================
-- ÉTAPE 3 : Supprimer les fiches_jours des fiches secondaires
-- ============================================================================
-- ⚠️ ATTENTION : Exécuter cette requête avec précaution !

DELETE FROM fiches_jours 
WHERE fiche_id IN (
  SELECT f.id
  FROM fiches f
  INNER JOIN utilisateurs u ON f.salarie_id = u.id
  WHERE u.chantier_principal_id IS NOT NULL
    AND f.chantier_id != u.chantier_principal_id
    AND f.statut IN ('BROUILLON', 'ENVOYE_RH', 'AUTO_VALIDE', 'VALIDE_CHEF')
);

-- ============================================================================
-- ÉTAPE 4 : Supprimer les signatures associées aux fiches secondaires
-- ============================================================================
DELETE FROM signatures 
WHERE fiche_id IN (
  SELECT f.id
  FROM fiches f
  INNER JOIN utilisateurs u ON f.salarie_id = u.id
  WHERE u.chantier_principal_id IS NOT NULL
    AND f.chantier_id != u.chantier_principal_id
    AND f.statut IN ('BROUILLON', 'ENVOYE_RH', 'AUTO_VALIDE', 'VALIDE_CHEF')
);

-- ============================================================================
-- ÉTAPE 5 : Supprimer les fiches secondaires
-- ============================================================================
DELETE FROM fiches 
WHERE id IN (
  SELECT f.id
  FROM fiches f
  INNER JOIN utilisateurs u ON f.salarie_id = u.id
  WHERE u.chantier_principal_id IS NOT NULL
    AND f.chantier_id != u.chantier_principal_id
    AND f.statut IN ('BROUILLON', 'ENVOYE_RH', 'AUTO_VALIDE', 'VALIDE_CHEF')
);

-- ============================================================================
-- ÉTAPE 6 : Vérification finale - Aucun doublon ne doit subsister
-- ============================================================================
-- Cette requête doit retourner 0 lignes après nettoyage
WITH chefs_principaux AS (
  SELECT id as chef_id, chantier_principal_id
  FROM utilisateurs
  WHERE chantier_principal_id IS NOT NULL
)
SELECT 
  u.nom,
  u.prenom,
  f.semaine,
  COUNT(f.id) as nb_fiches,
  STRING_AGG(c.code_chantier, ', ') as chantiers
FROM fiches f
INNER JOIN utilisateurs u ON f.salarie_id = u.id
INNER JOIN chantiers c ON f.chantier_id = c.id
WHERE f.salarie_id IN (SELECT chef_id FROM chefs_principaux)
GROUP BY u.nom, u.prenom, f.semaine
HAVING COUNT(f.id) > 1;

-- ============================================================================
-- RÉSUMÉ DES ACTIONS
-- ============================================================================
/*
Ce script :
1. Identifie les chefs ayant un chantier_principal_id défini
2. Supprime toutes leurs fiches sur les chantiers SECONDAIRES
3. Conserve uniquement la fiche sur leur chantier PRINCIPAL

Chefs concernés (après migration) :
- Sébastien BOUILLET : Principal = MAILLARD → Supprime fiches DAVOULT
- Giovanni DORAZIO : Principal = CREUSOT VILET → Supprime fiches CREUSOT HENRI

Après exécution :
- Chaque chef n'aura qu'UNE SEULE fiche par semaine (sur son chantier principal)
- Le total RH sera correct (39h et non 78h)
*/
