-- Mettre à jour le rôle d'Estelle de 'admin' à 'gestionnaire' sur Limoge Revillon
UPDATE public.user_roles 
SET role = 'gestionnaire' 
WHERE user_id = 'fc692517-7147-464f-8f10-50d3f46223cc'
  AND entreprise_id = 'edd12053-55dc-4f4b-b2ad-5048cb5aa798';