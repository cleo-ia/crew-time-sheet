-- Clean up existing fiches_jours data to align with 39h Mon→Fri standard
BEGIN;

-- 1) Remove all weekend entries (Sunday=0, Saturday=6)
DELETE FROM public.fiches_jours
WHERE EXTRACT(DOW FROM date) IN (0, 6);

-- 2) Normalize anomalies: set Mon–Thu to 8h when currently 7h and no intemperie
UPDATE public.fiches_jours
SET heures = 8, "HNORM" = 8
WHERE EXTRACT(DOW FROM date) IN (1,2,3,4)
  AND COALESCE("HI", 0) = 0
  AND heures = 7;

-- 3) Normalize anomalies: set Friday to 7h when currently 0h or 7h and no intemperie
UPDATE public.fiches_jours
SET heures = 7, "HNORM" = 7
WHERE EXTRACT(DOW FROM date) = 5
  AND COALESCE("HI", 0) = 0
  AND heures IN (0, 7);

COMMIT;