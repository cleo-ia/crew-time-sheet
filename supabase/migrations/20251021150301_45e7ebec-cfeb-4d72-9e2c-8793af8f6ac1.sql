-- Mise à jour de l'utilisateur comptalr avec nom et prénom
UPDATE public.utilisateurs 
SET 
  prenom = 'Jean',
  nom = 'Dupont',
  updated_at = now()
WHERE email = 'comptalr@groupe-engo.com';