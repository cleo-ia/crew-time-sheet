-- Correction S10 DAVOULT - Sébastien BOUILLET
UPDATE fiches_jours
SET heures = 0,
    "HNORM" = 0,
    "PA" = false,
    "T" = 0,
    code_trajet = null,
    updated_at = now()
WHERE fiche_id = '12b20853-c10d-44c2-a77a-f116ce43439d';

UPDATE fiches
SET total_heures = 0,
    updated_at = now()
WHERE id = '12b20853-c10d-44c2-a77a-f116ce43439d';