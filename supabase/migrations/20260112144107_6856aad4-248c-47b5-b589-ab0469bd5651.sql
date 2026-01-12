-- Ajouter colonne pour tracker si le demandeur a lu la réponse RH
ALTER TABLE demandes_conges 
ADD COLUMN lu_par_demandeur boolean NOT NULL DEFAULT true;

-- Les nouvelles demandes traitées seront marquées "non lues"
-- Les anciennes restent "lues" (pas de notification rétroactive)