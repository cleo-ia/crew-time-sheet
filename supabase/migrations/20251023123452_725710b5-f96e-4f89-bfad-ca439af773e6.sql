-- Créer la nouvelle table affectations_finisseurs_jours
CREATE TABLE public.affectations_finisseurs_jours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finisseur_id uuid NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  conducteur_id uuid NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  chantier_id uuid NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  date date NOT NULL,
  semaine text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_finisseur_date UNIQUE(finisseur_id, date)
);

-- Index pour performances
CREATE INDEX idx_affectations_finisseurs_jours_semaine ON public.affectations_finisseurs_jours(semaine);
CREATE INDEX idx_affectations_finisseurs_jours_conducteur ON public.affectations_finisseurs_jours(conducteur_id);
CREATE INDEX idx_affectations_finisseurs_jours_finisseur ON public.affectations_finisseurs_jours(finisseur_id);

-- RLS
ALTER TABLE public.affectations_finisseurs_jours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users"
ON public.affectations_finisseurs_jours
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.affectations_finisseurs_jours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Supprimer l'ancienne table affectations_finisseurs
DROP TABLE IF EXISTS public.affectations_finisseurs CASCADE;