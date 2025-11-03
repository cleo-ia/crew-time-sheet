-- Fonction pour calculer automatiquement total_jour
CREATE OR REPLACE FUNCTION public.set_total_jour()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- total_jour = HNORM + HI + T
  NEW.total_jour := COALESCE(NEW."HNORM", 0) + COALESCE(NEW."HI", 0) + COALESCE(NEW."T", 0);
  RETURN NEW;
END;
$$;

-- Trigger BEFORE INSERT/UPDATE sur fiches_jours pour calculer total_jour
DROP TRIGGER IF EXISTS trg_set_total_jour ON public.fiches_jours;
CREATE TRIGGER trg_set_total_jour
  BEFORE INSERT OR UPDATE
  ON public.fiches_jours
  FOR EACH ROW
  EXECUTE FUNCTION public.set_total_jour();

-- Trigger AFTER INSERT/UPDATE/DELETE sur fiches_jours pour recalculer total_heures de la fiche
DROP TRIGGER IF EXISTS trg_recalc_fiche_on_fj ON public.fiches_jours;
CREATE TRIGGER trg_recalc_fiche_on_fj
  AFTER INSERT OR UPDATE OR DELETE
  ON public.fiches_jours
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_total_fiche();