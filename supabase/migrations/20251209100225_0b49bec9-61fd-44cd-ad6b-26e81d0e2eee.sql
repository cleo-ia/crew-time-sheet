-- Table pour les ratios journaliers (M3 béton, ML voile, M2 coffrage, météo, observations, incidents)
-- Fonctionnalité exclusive à Limoge Revillon

CREATE TABLE public.ratios_journaliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_id uuid NOT NULL REFERENCES public.fiches(id) ON DELETE CASCADE,
  date date NOT NULL,
  m3_beton numeric(10,2),
  ml_voile numeric(10,2),
  m2_coffrage numeric(10,2),
  meteo text, -- 'ensoleille', 'nuageux', 'pluie_legere', 'pluie_forte', 'neige', 'gel', 'vent_fort'
  observations text,
  incident text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_ratio_fiche_date UNIQUE (fiche_id, date)
);

-- RLS : même logique que les autres tables liées aux fiches
ALTER TABLE public.ratios_journaliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for authenticated users" ON public.ratios_journaliers
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger pour updated_at
CREATE TRIGGER update_ratios_journaliers_updated_at
  BEFORE UPDATE ON public.ratios_journaliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();