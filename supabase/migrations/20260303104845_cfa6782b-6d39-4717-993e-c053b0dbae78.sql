-- Correction S09 - Sébastien BOUILLET : inverser heures DAVOULT ↔ MAILLARD

-- 1. Remettre DAVOULT (secondaire) à 0h
UPDATE fiches_jours
SET heures = 0,
    "HNORM" = 0,
    "PA" = false,
    "T" = 0,
    code_trajet = null,
    updated_at = now()
WHERE fiche_id = '1c787ef9-412e-452b-a56b-baa69a41755e';

UPDATE fiches
SET total_heures = 0,
    updated_at = now()
WHERE id = '1c787ef9-412e-452b-a56b-baa69a41755e';

-- 2. Mettre MAILLARD (principal) à 39h - Lun-Jeu: 8h, Ven: 7h
UPDATE fiches_jours
SET heures = 8,
    "HNORM" = 8,
    "PA" = true,
    "T" = 1,
    code_trajet = 'A_COMPLETER',
    updated_at = now()
WHERE fiche_id = 'bde705ab-e2da-4bf0-9747-41a840df05f8'
  AND date IN ('2026-02-23', '2026-02-24', '2026-02-25', '2026-02-26');

UPDATE fiches_jours
SET heures = 7,
    "HNORM" = 7,
    "PA" = true,
    "T" = 1,
    code_trajet = 'A_COMPLETER',
    updated_at = now()
WHERE fiche_id = 'bde705ab-e2da-4bf0-9747-41a840df05f8'
  AND date = '2026-02-27';

UPDATE fiches
SET total_heures = 39,
    updated_at = now()
WHERE id = 'bde705ab-e2da-4bf0-9747-41a840df05f8';