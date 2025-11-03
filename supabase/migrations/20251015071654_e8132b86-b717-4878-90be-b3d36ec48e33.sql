-- Ajout d'un chantier test pour les tests
INSERT INTO public.chantiers (
  nom,
  code_chantier,
  ville,
  chef_id,
  conducteur_id,
  created_by,
  actif,
  description
) VALUES (
  'Construction Centre Commercial',
  'CH-002',
  'Paris',
  NULL,
  NULL,
  'b47a0019-5abf-400c-be66-db9cbe9612eb',
  true,
  'Construction d''un nouveau centre commercial - Phase 1'
);