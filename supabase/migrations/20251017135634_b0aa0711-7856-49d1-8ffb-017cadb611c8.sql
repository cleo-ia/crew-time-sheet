-- Create admin invitation for tom.genin@groupe-engo.com
INSERT INTO public.invitations (email, role, status, expires_at, created_at, updated_at)
VALUES (
  'tom.genin@groupe-engo.com',
  'admin',
  'pending',
  now() + interval '7 days',
  now(),
  now()
)
ON CONFLICT (email) WHERE status = 'pending' 
DO UPDATE SET 
  expires_at = now() + interval '7 days',
  updated_at = now();