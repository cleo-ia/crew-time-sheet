CREATE TABLE public.codes_trajet_defaut (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  chantier_id uuid NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  salarie_id uuid NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  code_trajet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entreprise_id, chantier_id, salarie_id)
);

ALTER TABLE public.codes_trajet_defaut ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access codes_trajet_defaut of their company"
  ON public.codes_trajet_defaut FOR ALL TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

CREATE TRIGGER update_codes_trajet_defaut_updated_at
  BEFORE UPDATE ON public.codes_trajet_defaut
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();