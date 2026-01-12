-- Add column to track when a leave request was exported to PDF
ALTER TABLE demandes_conges 
ADD COLUMN exporte_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN demandes_conges.exporte_at IS 'Date et heure de l''export PDF de la demande';