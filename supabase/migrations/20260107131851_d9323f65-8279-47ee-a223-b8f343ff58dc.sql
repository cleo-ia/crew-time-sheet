
-- 1. Mettre à jour le statut de toutes les fiches de décembre 2025 à CLOTURE
UPDATE public.fiches 
SET statut = 'CLOTURE', updated_at = now()
WHERE semaine IN ('2025-S49', '2025-S50', '2025-S51', '2025-S52');

-- 2. Insérer l'enregistrement de clôture dans periodes_cloturees
INSERT INTO public.periodes_cloturees (
  periode,
  semaine_debut,
  semaine_fin,
  entreprise_id,
  nb_fiches,
  nb_salaries,
  nb_chantiers,
  total_heures,
  total_heures_normales,
  total_trajets,
  total_paniers,
  total_absences,
  total_intemperies,
  date_cloture,
  motif
) VALUES (
  'Décembre 2025',
  '2025-S49',
  '2025-S52',
  'edd12053-55dc-4f4b-b2ad-5048cb5aa798',
  120,
  35,
  4,
  4243.00,
  4243.00,
  580,
  508,
  5,
  0,
  now(),
  'Clôture automatique via Lovable'
);
