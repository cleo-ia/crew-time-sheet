-- Corriger le rôle super_admin pour le bon compte (theo.gouin@groupe-engo.com)
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = 'a3e6608f-cf9a-466d-bbe9-86da4184a667';

-- Remettre l'ancien compte incorrectement mis à jour en admin
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = '763f030a-23ae-4355-9a0c-1fc715a9ea70' 
AND role = 'super_admin';