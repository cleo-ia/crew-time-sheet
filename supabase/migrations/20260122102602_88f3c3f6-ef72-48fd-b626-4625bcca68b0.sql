-- Étape 1 : Passer tom.genin en super_admin sur TOUTES les entreprises
UPDATE public.user_roles 
SET role = 'super_admin'
WHERE user_id = '763f030a-23ae-4355-9a0c-1fc715a9ea70';

-- Étape 2 : Créer la fonction get_selected_entreprise_id() avec bypass super_admin
CREATE OR REPLACE FUNCTION public.get_selected_entreprise_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requested_id uuid;
  is_super boolean;
BEGIN
  -- Vérifier si l'utilisateur est super_admin (bypass total)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) INTO is_super;
  
  -- Si super_admin, retourner l'entreprise demandée sans vérification
  IF is_super THEN
    BEGIN
      requested_id := NULLIF(current_setting('request.headers', true)::json->>'x-entreprise-id', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      requested_id := NULL;
    END;
    IF requested_id IS NOT NULL THEN
      RETURN requested_id;
    END IF;
  END IF;
  
  -- Comportement normal pour les autres utilisateurs
  BEGIN
    requested_id := NULLIF(current_setting('request.headers', true)::json->>'x-entreprise-id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    requested_id := NULL;
  END;
  
  IF requested_id IS NOT NULL THEN
    -- Vérifier que l'utilisateur a accès à cette entreprise
    IF EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND entreprise_id = requested_id
    ) THEN
      RETURN requested_id;
    END IF;
  END IF;
  
  -- Fallback : première entreprise
  RETURN (
    SELECT entreprise_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    ORDER BY created_at ASC LIMIT 1
  );
END;
$$;

-- Étape 3 : Mettre à jour les policies de affectations_jours_chef avec bypass super_admin
DROP POLICY IF EXISTS "Users can view affectations_jours_chef in their entreprise" ON public.affectations_jours_chef;
DROP POLICY IF EXISTS "Users can insert affectations_jours_chef in their entreprise" ON public.affectations_jours_chef;
DROP POLICY IF EXISTS "Users can update affectations_jours_chef in their entreprise" ON public.affectations_jours_chef;
DROP POLICY IF EXISTS "Users can delete affectations_jours_chef in their entreprise" ON public.affectations_jours_chef;

CREATE POLICY "Users can view affectations_jours_chef in their entreprise"
  ON public.affectations_jours_chef FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin') 
    OR entreprise_id = get_selected_entreprise_id()
  );

CREATE POLICY "Users can insert affectations_jours_chef in their entreprise"
  ON public.affectations_jours_chef FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin') 
    OR entreprise_id = get_selected_entreprise_id()
  );

CREATE POLICY "Users can update affectations_jours_chef in their entreprise"
  ON public.affectations_jours_chef FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin') 
    OR entreprise_id = get_selected_entreprise_id()
  );

CREATE POLICY "Users can delete affectations_jours_chef in their entreprise"
  ON public.affectations_jours_chef FOR DELETE
  USING (
    has_role(auth.uid(), 'super_admin') 
    OR entreprise_id = get_selected_entreprise_id()
  );