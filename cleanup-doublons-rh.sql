-- ============================================================================
-- SCRIPT DE NETTOYAGE DES DOUBLONS - Fiches RH
-- ============================================================================
-- Ce script supprime les fiches BROUILLON en doublon et corrige les statuts
-- des fiches signées mais restées en BROUILLON
-- Exécution : Copier-coller dans l'éditeur SQL de Supabase
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Identifier les doublons (pour information)
-- ============================================================================
SELECT 
  f.salarie_id,
  u.nom,
  u.prenom,
  f.semaine,
  f.statut,
  f.id,
  f.created_at
FROM fiches f
LEFT JOIN utilisateurs u ON f.salarie_id = u.id
WHERE f.semaine IN ('2025-S44', '2025-S45')
ORDER BY f.salarie_id, f.semaine, f.statut DESC, f.created_at;

-- ============================================================================
-- ÉTAPE 2 : Supprimer les fiches BROUILLON en doublon
-- ============================================================================
-- Supprime les fiches BROUILLON quand une fiche ENVOYE_RH/AUTO_VALIDE existe
DELETE FROM fiches
WHERE id IN (
  SELECT f1.id
  FROM fiches f1
  INNER JOIN fiches f2 
    ON f1.salarie_id = f2.salarie_id 
    AND f1.semaine = f2.semaine
    AND COALESCE(f1.chantier_id::text, 'NULL') = COALESCE(f2.chantier_id::text, 'NULL')
  WHERE f1.statut = 'BROUILLON'
    AND f2.statut IN ('ENVOYE_RH', 'AUTO_VALIDE', 'VALIDE_CONDUCTEUR', 'VALIDE_CHEF')
    AND f1.id != f2.id
);

-- ============================================================================
-- ÉTAPE 3 : Corriger les statuts des fiches signées mais encore en BROUILLON
-- ============================================================================
UPDATE fiches
SET statut = 'ENVOYE_RH',
    updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT f.id
  FROM fiches f
  INNER JOIN signatures s ON s.fiche_id = f.id
  WHERE f.statut = 'BROUILLON'
    AND f.semaine IN ('2025-S44', '2025-S45')
);

-- ============================================================================
-- ÉTAPE 4 : Vérification finale
-- ============================================================================
-- Doit retourner 0 lignes (aucun doublon)
SELECT 
  salarie_id, 
  semaine, 
  COUNT(*) as nb_fiches
FROM fiches 
WHERE semaine IN ('2025-S44', '2025-S45')
GROUP BY salarie_id, semaine 
HAVING COUNT(*) > 1;

-- Vérifier le total des heures pour S44
SELECT 
  u.nom,
  u.prenom,
  f.semaine,
  f.statut,
  SUM(fj.heures) as total_heures
FROM fiches f
INNER JOIN utilisateurs u ON f.salarie_id = u.id
LEFT JOIN fiches_jours fj ON fj.fiche_id = f.id
WHERE f.semaine = '2025-S44'
  AND f.statut IN ('ENVOYE_RH', 'AUTO_VALIDE')
GROUP BY u.nom, u.prenom, f.semaine, f.statut
ORDER BY u.nom;

-- ============================================================================
-- RÉSULTAT ATTENDU
-- ============================================================================
/*
✅ Aya Mercier S44 : 1 seule fiche ENVOYE_RH avec 39h
✅ Aucun doublon pour les autres salariés
✅ Total S44 = 239h pour 6 salariés
*/
