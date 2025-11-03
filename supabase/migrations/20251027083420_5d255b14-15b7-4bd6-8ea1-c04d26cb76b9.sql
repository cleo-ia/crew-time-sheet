-- Migration: Nettoyage des doublons de fiches et ajout d'une contrainte d'unicité
-- Objectif: Résoudre les erreurs PGRST116 et garantir l'unicité des fiches

BEGIN;

-- 1. BACKUP: Créer une table temporaire avec tous les doublons détectés
CREATE TEMP TABLE fiches_duplicates_backup AS
SELECT f.*
FROM public.fiches f
WHERE EXISTS (
  SELECT 1
  FROM public.fiches f2
  WHERE f2.salarie_id = f.salarie_id
    AND f2.semaine = f.semaine
    AND f2.user_id = f.user_id
    AND COALESCE(f2.chantier_id::text, '') = COALESCE(f.chantier_id::text, '')
  GROUP BY f2.salarie_id, f2.semaine, f2.user_id, COALESCE(f2.chantier_id::text, '')
  HAVING COUNT(*) > 1
);

-- 2. SUPPRESSION DES DONNÉES LIÉES AUX DOUBLONS (garder la plus récente)
-- 2a. Supprimer les fiches_jours des doublons (sauf la plus récente)
DELETE FROM public.fiches_jours
WHERE fiche_id IN (
  SELECT f.id
  FROM public.fiches f
  INNER JOIN (
    SELECT salarie_id, semaine, user_id, COALESCE(chantier_id::text, '') as chantier_key, MAX(created_at) as max_created_at
    FROM public.fiches
    GROUP BY salarie_id, semaine, user_id, COALESCE(chantier_id::text, '')
    HAVING COUNT(*) > 1
  ) dups ON f.salarie_id = dups.salarie_id
    AND f.semaine = dups.semaine
    AND f.user_id = dups.user_id
    AND COALESCE(f.chantier_id::text, '') = dups.chantier_key
  WHERE f.created_at < dups.max_created_at
);

-- 2b. Supprimer les signatures des doublons (sauf la plus récente)
DELETE FROM public.signatures
WHERE fiche_id IN (
  SELECT f.id
  FROM public.fiches f
  INNER JOIN (
    SELECT salarie_id, semaine, user_id, COALESCE(chantier_id::text, '') as chantier_key, MAX(created_at) as max_created_at
    FROM public.fiches
    GROUP BY salarie_id, semaine, user_id, COALESCE(chantier_id::text, '')
    HAVING COUNT(*) > 1
  ) dups ON f.salarie_id = dups.salarie_id
    AND f.semaine = dups.semaine
    AND f.user_id = dups.user_id
    AND COALESCE(f.chantier_id::text, '') = dups.chantier_key
  WHERE f.created_at < dups.max_created_at
);

-- 2c. Supprimer les fiches_transport des doublons (sauf la plus récente)
DELETE FROM public.fiches_transport
WHERE fiche_id IN (
  SELECT f.id
  FROM public.fiches f
  INNER JOIN (
    SELECT salarie_id, semaine, user_id, COALESCE(chantier_id::text, '') as chantier_key, MAX(created_at) as max_created_at
    FROM public.fiches
    GROUP BY salarie_id, semaine, user_id, COALESCE(chantier_id::text, '')
    HAVING COUNT(*) > 1
  ) dups ON f.salarie_id = dups.salarie_id
    AND f.semaine = dups.semaine
    AND f.user_id = dups.user_id
    AND COALESCE(f.chantier_id::text, '') = dups.chantier_key
  WHERE f.created_at < dups.max_created_at
);

-- 2d. Supprimer les fiches_transport_finisseurs des doublons (sauf la plus récente)
DELETE FROM public.fiches_transport_finisseurs
WHERE fiche_id IN (
  SELECT f.id
  FROM public.fiches f
  INNER JOIN (
    SELECT salarie_id, semaine, user_id, COALESCE(chantier_id::text, '') as chantier_key, MAX(created_at) as max_created_at
    FROM public.fiches
    GROUP BY salarie_id, semaine, user_id, COALESCE(chantier_id::text, '')
    HAVING COUNT(*) > 1
  ) dups ON f.salarie_id = dups.salarie_id
    AND f.semaine = dups.semaine
    AND f.user_id = dups.user_id
    AND COALESCE(f.chantier_id::text, '') = dups.chantier_key
  WHERE f.created_at < dups.max_created_at
);

-- 3. SUPPRESSION DES FICHES EN DOUBLON (garder la plus récente)
DELETE FROM public.fiches
WHERE id IN (
  SELECT f.id
  FROM public.fiches f
  INNER JOIN (
    SELECT salarie_id, semaine, user_id, COALESCE(chantier_id::text, '') as chantier_key, MAX(created_at) as max_created_at
    FROM public.fiches
    GROUP BY salarie_id, semaine, user_id, COALESCE(chantier_id::text, '')
    HAVING COUNT(*) > 1
  ) dups ON f.salarie_id = dups.salarie_id
    AND f.semaine = dups.semaine
    AND f.user_id = dups.user_id
    AND COALESCE(f.chantier_id::text, '') = dups.chantier_key
  WHERE f.created_at < dups.max_created_at
);

-- 4. CONTRAINTE D'UNICITÉ: Créer un index unique pour empêcher les futurs doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_fiches_unique_salarie_semaine_user_chantier
ON public.fiches (
  salarie_id,
  semaine,
  user_id,
  COALESCE(chantier_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

COMMIT;

-- Note: La table fiches_duplicates_backup est temporaire et sera supprimée à la fin de la session
-- Si vous souhaitez consulter les doublons supprimés, vous pouvez créer une table permanente à la place