-- Phase 1 : Correction des données existantes
-- Corriger la fiche_id de zaki kawa
UPDATE fiches_transport_finisseurs
SET fiche_id = 'bef01694-4425-45b7-b755-086cd0b60668'
WHERE id = 'de7b5e09-01b0-425c-950c-abaac9145efa';

-- Phase 3 : Protection en base de données
-- Créer une fonction de validation de cohérence
CREATE OR REPLACE FUNCTION public.check_fiche_transport_finisseur_coherence()
RETURNS TRIGGER AS $$
DECLARE
  fiche_salarie_id uuid;
BEGIN
  -- Récupérer le salarie_id de la fiche référencée
  SELECT salarie_id INTO fiche_salarie_id
  FROM public.fiches
  WHERE id = NEW.fiche_id;
  
  -- Vérifier la cohérence
  IF fiche_salarie_id IS NOT NULL AND fiche_salarie_id != NEW.finisseur_id THEN
    RAISE EXCEPTION 'Incohérence détectée: la fiche % appartient au salarié %, mais finisseur_id = %. Chaque fiche transport finisseur doit pointer vers la fiche du finisseur concerné.',
      NEW.fiche_id, fiche_salarie_id, NEW.finisseur_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger de validation
CREATE TRIGGER validate_fiche_transport_finisseur_coherence
  BEFORE INSERT OR UPDATE ON public.fiches_transport_finisseurs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_fiche_transport_finisseur_coherence();