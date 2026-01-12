-- Ajouter la colonne signature_data à la table demandes_conges
ALTER TABLE demandes_conges 
ADD COLUMN signature_data TEXT;

-- Commentaire pour documenter
COMMENT ON COLUMN demandes_conges.signature_data IS 'Signature du demandeur au format base64 (data URL)';