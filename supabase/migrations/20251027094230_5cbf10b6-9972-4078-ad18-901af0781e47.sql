-- Créer le trigger sur la table fiches_jours pour recalculer automatiquement total_heures
-- Ce trigger résout le bug où total_heures n'était pas synchronisé avec la somme des fiches_jours
CREATE TRIGGER trigger_recalc_total_fiche
  AFTER INSERT OR UPDATE OR DELETE ON public.fiches_jours
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_fiche_total_heures();