-- =====================================================
-- PHASE 1: Tables Critiques - Isolation Stricte
-- =====================================================

-- 1. fiches_jours
DROP POLICY IF EXISTS "Temporary: allow all access to fiches_jours" ON public.fiches_jours;

CREATE POLICY "Users can access fiches_jours of their company"
  ON public.fiches_jours FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 2. signatures
DROP POLICY IF EXISTS "Temporary: allow all access to signatures" ON public.signatures;

CREATE POLICY "Users can access signatures of their company"
  ON public.signatures FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 3. fiches_transport
DROP POLICY IF EXISTS "Enable all access for development" ON public.fiches_transport;

CREATE POLICY "Users can access fiches_transport of their company"
  ON public.fiches_transport FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 4. fiches_transport_jours
DROP POLICY IF EXISTS "Enable all access for development" ON public.fiches_transport_jours;

CREATE POLICY "Users can access fiches_transport_jours of their company"
  ON public.fiches_transport_jours FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 5. fiches_transport_finisseurs
DROP POLICY IF EXISTS "Enable all access for development" ON public.fiches_transport_finisseurs;

CREATE POLICY "Users can access fiches_transport_finisseurs of their company"
  ON public.fiches_transport_finisseurs FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 6. fiches_transport_finisseurs_jours
DROP POLICY IF EXISTS "Enable all access for development" ON public.fiches_transport_finisseurs_jours;

CREATE POLICY "Users can access fiches_transport_finisseurs_jours of their company"
  ON public.fiches_transport_finisseurs_jours FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 7. affectations_finisseurs_jours
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.affectations_finisseurs_jours;

CREATE POLICY "Users can access affectations_finisseurs_jours of their company"
  ON public.affectations_finisseurs_jours FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 8. affectations_jours_chef - Retirer le bypass super_admin
DROP POLICY IF EXISTS "Users can view affectations_jours_chef in their entreprise" ON public.affectations_jours_chef;
DROP POLICY IF EXISTS "Users can insert affectations_jours_chef in their entreprise" ON public.affectations_jours_chef;
DROP POLICY IF EXISTS "Users can update affectations_jours_chef in their entreprise" ON public.affectations_jours_chef;
DROP POLICY IF EXISTS "Users can delete affectations_jours_chef in their entreprise" ON public.affectations_jours_chef;

CREATE POLICY "Users can view affectations_jours_chef in their entreprise"
  ON public.affectations_jours_chef FOR SELECT
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id());

CREATE POLICY "Users can insert affectations_jours_chef in their entreprise"
  ON public.affectations_jours_chef FOR INSERT
  TO authenticated
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

CREATE POLICY "Users can update affectations_jours_chef in their entreprise"
  ON public.affectations_jours_chef FOR UPDATE
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id());

CREATE POLICY "Users can delete affectations_jours_chef in their entreprise"
  ON public.affectations_jours_chef FOR DELETE
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id());

-- =====================================================
-- PHASE 2: Tables Secondaires - Défense en Profondeur
-- =====================================================

-- 9. achats_chantier
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.achats_chantier;

CREATE POLICY "Users can access achats of their company"
  ON public.achats_chantier FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 10. taches_chantier
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.taches_chantier;

CREATE POLICY "Users can access taches of their company"
  ON public.taches_chantier FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 11. todos_chantier
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.todos_chantier;

CREATE POLICY "Users can access todos of their company"
  ON public.todos_chantier FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 12. ratios_journaliers
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.ratios_journaliers;

CREATE POLICY "Users can access ratios of their company"
  ON public.ratios_journaliers FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 13. chantiers_documents
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.chantiers_documents;

CREATE POLICY "Users can access chantiers_documents of their company"
  ON public.chantiers_documents FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 14. chantiers_dossiers
DROP POLICY IF EXISTS "Authenticated users can view folders" ON public.chantiers_dossiers;
DROP POLICY IF EXISTS "Authenticated users can create folders" ON public.chantiers_dossiers;
DROP POLICY IF EXISTS "Authenticated users can update folders" ON public.chantiers_dossiers;
DROP POLICY IF EXISTS "Authenticated users can delete folders" ON public.chantiers_dossiers;

CREATE POLICY "Users can access dossiers of their company"
  ON public.chantiers_dossiers FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 15. taches_documents
DROP POLICY IF EXISTS "Authenticated users can view task documents" ON public.taches_documents;
DROP POLICY IF EXISTS "Authenticated users can insert task documents" ON public.taches_documents;
DROP POLICY IF EXISTS "Authenticated users can delete task documents" ON public.taches_documents;

CREATE POLICY "Users can access taches_documents of their company"
  ON public.taches_documents FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());

-- 16. todos_documents
DROP POLICY IF EXISTS "Authenticated users can view todo documents" ON public.todos_documents;
DROP POLICY IF EXISTS "Authenticated users can insert todo documents" ON public.todos_documents;
DROP POLICY IF EXISTS "Authenticated users can delete todo documents" ON public.todos_documents;

CREATE POLICY "Users can access todos_documents of their company"
  ON public.todos_documents FOR ALL
  TO authenticated
  USING (entreprise_id = get_selected_entreprise_id())
  WITH CHECK (entreprise_id = get_selected_entreprise_id());