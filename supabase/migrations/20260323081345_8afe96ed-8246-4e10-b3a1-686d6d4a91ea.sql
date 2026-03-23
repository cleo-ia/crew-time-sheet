-- Changer la contrainte unique pour supporter les chefs multi-chantier
ALTER TABLE affectations_jours_chef 
  DROP CONSTRAINT affectations_jours_chef_macon_id_jour_key;

ALTER TABLE affectations_jours_chef 
  ADD CONSTRAINT affectations_jours_chef_macon_jour_chantier_key 
  UNIQUE (macon_id, jour, chantier_id);