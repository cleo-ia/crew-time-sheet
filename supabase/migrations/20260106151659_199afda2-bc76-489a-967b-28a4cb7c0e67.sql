
-- Insérer la période clôturée pour décembre 2025
INSERT INTO periodes_cloturees (
  entreprise_id,
  periode,
  semaine_debut,
  semaine_fin,
  nb_fiches,
  nb_salaries,
  nb_chantiers,
  total_heures,
  date_cloture,
  motif
) VALUES (
  'edd12053-55dc-4f4b-b2ad-5048cb5aa798',
  '2025-12',
  '2025-S49',
  '2025-S52',
  120,
  35,
  4,
  4243.00,
  now(),
  'Clôture forcée - données incomplètes acceptées'
);

-- Mettre à jour toutes les fiches de décembre 2025 au statut CLOTURE
UPDATE fiches 
SET statut = 'CLOTURE', updated_at = now()
WHERE semaine IN ('2025-S49', '2025-S50', '2025-S51', '2025-S52')
  AND statut != 'CLOTURE';
