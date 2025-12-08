-- 🔐 CORRECTION CRITIQUE : Isolation des données fiches par entreprise
-- Supprime la policy permissive et la remplace par une policy restrictive

-- Supprimer l'ancienne policy permissive
DROP POLICY IF EXISTS "Temporary: allow all access to fiches" ON public.fiches;

-- Nouvelle policy basée sur l'entreprise du chantier ou du salarié (finisseurs autonomes)
CREATE POLICY "Users can access fiches of their companies"
ON public.fiches
FOR ALL
USING (
  -- Cas 1: Fiche liée à un chantier → vérifier via chantier
  (chantier_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.chantiers c
    WHERE c.id = chantier_id
    AND public.user_has_access_to_entreprise(c.entreprise_id)
  ))
  OR
  -- Cas 2: Finisseur autonome (chantier_id NULL) → vérifier via salarié
  (chantier_id IS NULL AND salarie_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.utilisateurs u
    WHERE u.id = salarie_id
    AND public.user_has_access_to_entreprise(u.entreprise_id)
  ))
)
WITH CHECK (
  (chantier_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.chantiers c
    WHERE c.id = chantier_id
    AND public.user_has_access_to_entreprise(c.entreprise_id)
  ))
  OR
  (chantier_id IS NULL AND salarie_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.utilisateurs u
    WHERE u.id = salarie_id
    AND public.user_has_access_to_entreprise(u.entreprise_id)
  ))
);