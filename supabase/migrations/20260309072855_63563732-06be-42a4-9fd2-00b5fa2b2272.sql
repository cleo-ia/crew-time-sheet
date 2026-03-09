CREATE UNIQUE INDEX IF NOT EXISTS idx_periodes_cloturees_periode_entreprise 
ON public.periodes_cloturees(periode, entreprise_id);