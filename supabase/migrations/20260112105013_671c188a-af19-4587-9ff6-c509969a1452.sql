-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Chefs can create own demandes" ON demandes_conges;

-- Créer une politique élargie pour les chefs
CREATE POLICY "Chefs can create demandes for team"
ON demandes_conges
FOR INSERT
TO authenticated
WITH CHECK (
  entreprise_id = get_user_entreprise_id()
  AND (
    -- Cas 1: Le chef crée une demande pour lui-même
    demandeur_id IN (
      SELECT id FROM utilisateurs WHERE auth_user_id = auth.uid()
    )
    OR
    -- Cas 2: Le chef crée pour un maçon de son équipe
    demandeur_id IN (
      SELECT DISTINCT a.macon_id
      FROM affectations a
      JOIN chantiers c ON c.id = a.chantier_id
      WHERE c.chef_id IN (
        -- Supporte les deux formats de chef_id (auth_user_id ou utilisateurs.id)
        SELECT auth_user_id FROM utilisateurs WHERE auth_user_id = auth.uid()
        UNION
        SELECT id FROM utilisateurs WHERE auth_user_id = auth.uid()
      )
    )
  )
);