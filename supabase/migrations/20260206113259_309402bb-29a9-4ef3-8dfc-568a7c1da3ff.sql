
-- Mise à jour en masse des employés SDER (chefs, maçons, grutiers, finisseurs)
-- base_horaire: 38h, horaire mensuel: 164.67, heures supp mensualisées: 13
UPDATE public.utilisateurs
SET base_horaire = '38h',
    horaire = '164.67',
    heures_supp_mensualisees = 13,
    updated_at = now()
WHERE entreprise_id = (SELECT id FROM entreprises WHERE slug = 'sder')
  AND role_metier IN ('chef', 'macon', 'grutier', 'finisseur');
