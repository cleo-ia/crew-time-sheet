-- Nettoyer les données incohérentes avant d'ajouter les contraintes CASCADE

-- 1. Supprimer les fiches qui référencent des salariés inexistants
DELETE FROM public.fiches 
WHERE salarie_id IS NOT NULL 
  AND salarie_id NOT IN (SELECT id FROM public.utilisateurs);

-- 2. Supprimer les affectations qui référencent des maçons inexistants
DELETE FROM public.affectations 
WHERE macon_id IS NOT NULL 
  AND macon_id NOT IN (SELECT id FROM public.utilisateurs);

-- 3. Nettoyer les conducteurs inexistants dans fiches_transport_jours (SET NULL)
UPDATE public.fiches_transport_jours
SET conducteur_aller_id = NULL
WHERE conducteur_aller_id IS NOT NULL 
  AND conducteur_aller_id NOT IN (SELECT id FROM public.utilisateurs);

UPDATE public.fiches_transport_jours
SET conducteur_retour_id = NULL
WHERE conducteur_retour_id IS NOT NULL 
  AND conducteur_retour_id NOT IN (SELECT id FROM public.utilisateurs);

-- 4. Nettoyer les chefs inexistants dans chantiers
UPDATE public.chantiers
SET chef_id = NULL
WHERE chef_id IS NOT NULL 
  AND chef_id NOT IN (SELECT id FROM public.utilisateurs);

-- 5. Nettoyer les conducteurs inexistants dans chantiers
UPDATE public.chantiers
SET conducteur_id = NULL
WHERE conducteur_id IS NOT NULL 
  AND conducteur_id NOT IN (SELECT id FROM public.utilisateurs);

-- Maintenant, modifier les contraintes de clés étrangères

-- 6. Fiches: suppression en cascade quand le salarié est supprimé
ALTER TABLE public.fiches 
DROP CONSTRAINT IF EXISTS fiches_salarie_id_fkey CASCADE;

ALTER TABLE public.fiches
ADD CONSTRAINT fiches_salarie_id_fkey 
  FOREIGN KEY (salarie_id) 
  REFERENCES public.utilisateurs(id) 
  ON DELETE CASCADE;

-- 7. Affectations: suppression en cascade quand le maçon est supprimé
ALTER TABLE public.affectations
DROP CONSTRAINT IF EXISTS affectations_macon_id_fkey CASCADE;

ALTER TABLE public.affectations
ADD CONSTRAINT affectations_macon_id_fkey
  FOREIGN KEY (macon_id)
  REFERENCES public.utilisateurs(id)
  ON DELETE CASCADE;

-- 8. Fiches_transport_jours: SET NULL pour les conducteurs (préserve les données de transport)
ALTER TABLE public.fiches_transport_jours
DROP CONSTRAINT IF EXISTS fiches_transport_jours_conducteur_aller_id_fkey CASCADE;

ALTER TABLE public.fiches_transport_jours
ADD CONSTRAINT fiches_transport_jours_conducteur_aller_id_fkey
  FOREIGN KEY (conducteur_aller_id)
  REFERENCES public.utilisateurs(id)
  ON DELETE SET NULL;

ALTER TABLE public.fiches_transport_jours
DROP CONSTRAINT IF EXISTS fiches_transport_jours_conducteur_retour_id_fkey CASCADE;

ALTER TABLE public.fiches_transport_jours
ADD CONSTRAINT fiches_transport_jours_conducteur_retour_id_fkey
  FOREIGN KEY (conducteur_retour_id)
  REFERENCES public.utilisateurs(id)
  ON DELETE SET NULL;

-- 9. Chantiers: SET NULL pour le chef (préserve le chantier)
ALTER TABLE public.chantiers
DROP CONSTRAINT IF EXISTS chantiers_chef_id_fkey CASCADE;

ALTER TABLE public.chantiers
ADD CONSTRAINT chantiers_chef_id_fkey
  FOREIGN KEY (chef_id)
  REFERENCES public.utilisateurs(id)
  ON DELETE SET NULL;

-- 10. Chantiers: SET NULL pour le conducteur (préserve le chantier)
ALTER TABLE public.chantiers
DROP CONSTRAINT IF EXISTS chantiers_conducteur_id_fkey CASCADE;

ALTER TABLE public.chantiers
ADD CONSTRAINT chantiers_conducteur_id_fkey
  FOREIGN KEY (conducteur_id)
  REFERENCES public.utilisateurs(id)
  ON DELETE SET NULL;