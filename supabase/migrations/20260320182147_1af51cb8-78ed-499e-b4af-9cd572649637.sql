-- Insérer code_trajet = 'AUCUN' pour tous les employés terrain sur PAM et ECOLE
-- Corrigé avec le bon entreprise_id
INSERT INTO codes_trajet_defaut (entreprise_id, chantier_id, salarie_id, code_trajet)
SELECT 'edd12053-55dc-4f4b-b2ad-5048cb5aa798', c.chantier_id, u.id, 'AUCUN'
FROM utilisateurs u
CROSS JOIN (VALUES 
  ('5e9f9798-06be-4e70-a9b0-e7d02b22347a'::uuid),
  ('41a4da9f-58b2-45ed-bced-7a8a72b52d03'::uuid)
) AS c(chantier_id)
WHERE u.entreprise_id = 'edd12053-55dc-4f4b-b2ad-5048cb5aa798'
  AND u.role_metier IN ('chef','macon','grutier','finisseur')
ON CONFLICT DO NOTHING;