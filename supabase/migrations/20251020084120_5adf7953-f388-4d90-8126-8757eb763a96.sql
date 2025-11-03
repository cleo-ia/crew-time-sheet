-- Corriger les données de Theo Gouin
UPDATE public.utilisateurs 
SET 
  prenom = 'Theo',
  nom = 'Gouin',
  updated_at = now()
WHERE email = 'theo.gouin@groupe-engo.com' AND (prenom IS NULL OR nom IS NULL);

UPDATE public.profiles
SET
  first_name = 'Theo',
  last_name = 'Gouin',
  updated_at = now()
WHERE email = 'theo.gouin@groupe-engo.com' AND (first_name IS NULL OR last_name IS NULL);