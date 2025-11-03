-- Créer le trigger pour recalculer automatiquement total_heures dans fiches
-- à chaque modification des fiches_jours
CREATE OR REPLACE TRIGGER trigger_recalculate_fiche_total
AFTER INSERT OR UPDATE OR DELETE ON public.fiches_jours
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_fiche_total_heures();