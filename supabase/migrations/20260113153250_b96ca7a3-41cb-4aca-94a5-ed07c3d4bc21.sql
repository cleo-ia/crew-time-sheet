-- Supprimer l'invitation existante d'Anthony Lampert pour permettre une nouvelle invitation
DELETE FROM public.invitations 
WHERE email = 'anthony.lampert@groupe-engo.com';