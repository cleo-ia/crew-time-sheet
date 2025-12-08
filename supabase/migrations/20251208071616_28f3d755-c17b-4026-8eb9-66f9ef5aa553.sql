-- Ajouter le rôle admin pour Engo Bourgogne pour l'utilisateur
INSERT INTO public.user_roles (user_id, role, entreprise_id, has_completed_onboarding)
VALUES (
  '763f030a-23ae-4355-9a0c-1fc715a9ea70',
  'admin',
  'ac321acb-feb2-4f66-8e71-08f5dc61ffda',
  true
);