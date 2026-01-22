-- Table pour stocker les validations de planning par entreprise et semaine
CREATE TABLE public.planning_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  semaine TEXT NOT NULL,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_validation_semaine_entreprise UNIQUE(entreprise_id, semaine)
);

-- Enable RLS
ALTER TABLE public.planning_validations ENABLE ROW LEVEL SECURITY;

-- Policy: conducteurs, admins et super_admins peuvent lire les validations de leur entreprise
CREATE POLICY "Users can view validations for their entreprise"
ON public.planning_validations
FOR SELECT
TO authenticated
USING (
  user_has_access_to_entreprise(entreprise_id)
);

-- Policy: conducteurs, admins et super_admins peuvent créer des validations
CREATE POLICY "Conducteurs and admins can create validations"
ON public.planning_validations
FOR INSERT
TO authenticated
WITH CHECK (
  user_has_access_to_entreprise(entreprise_id)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('conducteur', 'admin', 'super_admin')
  )
);

-- Policy: conducteurs, admins et super_admins peuvent supprimer les validations
CREATE POLICY "Conducteurs and admins can delete validations"
ON public.planning_validations
FOR DELETE
TO authenticated
USING (
  user_has_access_to_entreprise(entreprise_id)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('conducteur', 'admin', 'super_admin')
  )
);