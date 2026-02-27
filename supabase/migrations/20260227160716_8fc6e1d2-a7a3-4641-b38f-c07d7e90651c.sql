
-- Table pour tracker le statut de rapprochement par agence et par semaine
CREATE TABLE public.rapprochements_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid NOT NULL REFERENCES public.entreprises(id),
  agence_name text NOT NULL,
  semaine text NOT NULL,
  periode text NOT NULL,
  rapproche boolean NOT NULL DEFAULT false,
  rapproche_at timestamptz,
  rapproche_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entreprise_id, agence_name, semaine)
);

-- Enable RLS
ALTER TABLE public.rapprochements_status ENABLE ROW LEVEL SECURITY;

-- Policy: gestionnaire, rh, admin, super_admin can access their company's data
CREATE POLICY "Users can access rapprochements_status of their company"
ON public.rapprochements_status
FOR ALL
USING (entreprise_id = get_selected_entreprise_id())
WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- Trigger for updated_at
CREATE TRIGGER update_rapprochements_status_updated_at
BEFORE UPDATE ON public.rapprochements_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
