
-- Insérer code_trajet = 'AUCUN' pour tous les employés terrain sur PAM et ECOLE
INSERT INTO codes_trajet_defaut (entreprise_id, chantier_id, salarie_id, code_trajet)
SELECT 'edd12053-0714-4a3d-abf0-b8f13127659e', c.chantier_id, u.id, 'AUCUN'
FROM utilisateurs u
CROSS JOIN (VALUES ('5e9f9798-06be-4e70-a9b0-e7d02b22347a'::uuid), ('41a4da9f-58b2-45ed-bced-7a8a72b52d03'::uuid)) AS c(chantier_id)
WHERE u.entreprise_id = 'edd12053-0714-4a3d-abf0-b8f13127659e'
  AND u.role_metier IN ('chef','macon','grutier','finisseur')
ON CONFLICT DO NOTHING;
