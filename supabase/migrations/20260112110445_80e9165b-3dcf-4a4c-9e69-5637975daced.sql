-- Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "Chefs can create demandes for team" ON demandes_conges;
DROP POLICY IF EXISTS "Chefs can create own demandes" ON demandes_conges;
DROP POLICY IF EXISTS "Chefs can view own demandes" ON demandes_conges;
DROP POLICY IF EXISTS "Conducteurs can view chefs demandes" ON demandes_conges;
DROP POLICY IF EXISTS "Conducteurs can update chefs demandes" ON demandes_conges;
DROP POLICY IF EXISTS "RH can view all demandes" ON demandes_conges;
DROP POLICY IF EXISTS "RH can update all demandes" ON demandes_conges;
DROP POLICY IF EXISTS "Admins can view all demandes" ON demandes_conges;
DROP POLICY IF EXISTS "Admins can update all demandes" ON demandes_conges;

-- Créer les nouvelles politiques simplifiées

-- INSERT : Tout utilisateur authentifié peut créer une demande pour son entreprise
CREATE POLICY "Users can create demandes in company"
ON demandes_conges
FOR INSERT
TO authenticated
WITH CHECK (entreprise_id = get_user_entreprise_id());

-- SELECT : Tout utilisateur authentifié peut voir les demandes de son entreprise
CREATE POLICY "Users can view demandes in company"
ON demandes_conges
FOR SELECT
TO authenticated
USING (entreprise_id = get_user_entreprise_id());

-- UPDATE : Tout utilisateur authentifié peut modifier les demandes de son entreprise
CREATE POLICY "Users can update demandes in company"
ON demandes_conges
FOR UPDATE
TO authenticated
USING (entreprise_id = get_user_entreprise_id());

-- DELETE : Seuls les admins peuvent supprimer
CREATE POLICY "Admins can delete demandes"
ON demandes_conges
FOR DELETE
TO authenticated
USING (
  entreprise_id = get_user_entreprise_id()
  AND has_role(auth.uid(), 'admin')
);