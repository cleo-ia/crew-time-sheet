-- Remettre l'invitation d'Anthony Lampert en état 'pending' pour permettre le renvoi
UPDATE public.invitations
SET 
  status = 'pending',
  accepted_at = NULL,
  expires_at = NOW() + INTERVAL '7 days',
  updated_at = NOW()
WHERE email = 'anthony.lampert@groupe-engo.com';