-- Corriger le trigger de fiches_transport pour utiliser fiche_id au lieu de chantier_id
-- Cela garantit que entreprise_id est toujours hérité de la fiche parente

DROP TRIGGER IF EXISTS tr_fiches_transport_set_entreprise ON fiches_transport;

CREATE TRIGGER tr_fiches_transport_set_entreprise
  BEFORE INSERT ON fiches_transport 
  FOR EACH ROW 
  EXECUTE FUNCTION set_entreprise_from_fiche();