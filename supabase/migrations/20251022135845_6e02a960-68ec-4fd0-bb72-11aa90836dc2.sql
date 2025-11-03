-- Corriger tous les lundis avec HNORM=9 et HI=0 -> forcer à 8h
-- Cette migration corrige le bug où les lundis étaient initialisés à 9h au lieu de 8h
UPDATE fiches_jours fj
SET 
  "HNORM" = 8,
  heures = 8,
  updated_at = NOW()
WHERE 
  EXTRACT(DOW FROM fj.date) = 1  -- Lundi (1 = lundi en PostgreSQL)
  AND "HNORM" = 9
  AND "HI" = 0;