-- Phase 1 : Migration pour notifications conducteur
-- =================================================

-- 1) Ajouter colonne de tracking pour anti-doublon n8n
ALTER TABLE public.fiches
ADD COLUMN IF NOT EXISTS notification_conducteur_envoyee_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.fiches.notification_conducteur_envoyee_at IS 
'Timestamp de l''envoi de la notification au conducteur pour ce lot (chantier+semaine). Utilisé par n8n pour éviter les doublons.';

-- 2) Index de performance pour requêtes n8n
CREATE INDEX IF NOT EXISTS idx_fiches_chantier_semaine
  ON public.fiches (chantier_id, semaine);

CREATE INDEX IF NOT EXISTS idx_fiches_statut
  ON public.fiches (statut);

COMMENT ON INDEX public.idx_fiches_chantier_semaine IS 
'Accélère les requêtes de regroupement par chantier et semaine (utilisé par n8n polling)';

COMMENT ON INDEX public.idx_fiches_statut IS 
'Accélère les requêtes de filtrage par statut (utilisé par tous les workflows)';

-- 3) Vue "lots prêts conducteur" pour polling n8n
CREATE OR REPLACE VIEW public.v_lots_pret_conducteur AS
SELECT
  f.chantier_id,
  f.semaine,
  c.chef_id,
  c.conducteur_id,
  COUNT(*) FILTER (WHERE f.statut IN ('BROUILLON','EN_SIGNATURE')) AS nb_non_prets,
  COUNT(*) FILTER (WHERE f.statut = 'VALIDE_CHEF')                AS nb_prets,
  MIN(f.notification_conducteur_envoyee_at)                        AS notif_exists
FROM public.fiches f
JOIN public.chantiers c ON c.id = f.chantier_id
GROUP BY f.chantier_id, f.semaine, c.chef_id, c.conducteur_id;

COMMENT ON VIEW public.v_lots_pret_conducteur IS 
'Vue pour identifier les lots (chantier+semaine) prêts à être notifiés au conducteur.
Un lot est prêt si : nb_non_prets = 0 AND nb_prets > 0 AND notif_exists IS NULL.
Utilisée par le Workflow 2 n8n (polling toutes les 5 min).';