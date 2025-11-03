-- 1. Créer la nouvelle table vehicules_finisseurs
CREATE TABLE public.vehicules_finisseurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  immatriculation text NOT NULL UNIQUE,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Activer RLS sur vehicules_finisseurs
ALTER TABLE public.vehicules_finisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Temporary: allow all access to vehicules_finisseurs"
  ON public.vehicules_finisseurs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Créer le trigger updated_at pour vehicules_finisseurs
CREATE TRIGGER set_updated_at_vehicules_finisseurs
  BEFORE UPDATE ON public.vehicules_finisseurs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Renommer la table vehicules en vehicules_chefs_macons
ALTER TABLE public.vehicules RENAME TO vehicules_chefs_macons;

-- Note: Les politiques RLS et triggers existants sont automatiquement conservés lors du rename