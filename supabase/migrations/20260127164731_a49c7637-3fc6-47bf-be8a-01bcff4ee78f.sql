-- 1. Ajouter email_depot aux entreprises
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS email_depot text;

-- 2. Créer la table principale
CREATE TABLE IF NOT EXISTS fiches_transport_materiaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid NOT NULL REFERENCES entreprises(id),
  chantier_id uuid NOT NULL REFERENCES chantiers(id),
  conducteur_id uuid NOT NULL REFERENCES utilisateurs(id),
  semaine_livraison integer NOT NULL,
  jour_livraison date NOT NULL,
  moyen_transport text DEFAULT 'Camion grue',
  responsable_depot text,
  statut text DEFAULT 'BROUILLON',
  transmise_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Créer la table des lignes
CREATE TABLE IF NOT EXISTS fiches_transport_materiaux_lignes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_id uuid NOT NULL REFERENCES fiches_transport_materiaux(id) ON DELETE CASCADE,
  categorie text DEFAULT 'Matériel',
  designation text NOT NULL,
  unite text DEFAULT 'U',
  quantite numeric NOT NULL DEFAULT 1,
  reel_charge numeric,
  entreprise_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. RLS policies (isolation multi-tenant)
ALTER TABLE fiches_transport_materiaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiches_transport_materiaux_lignes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access fiches_transport_materiaux of their company"
ON fiches_transport_materiaux FOR ALL
USING (user_has_access_to_entreprise(entreprise_id))
WITH CHECK (user_has_access_to_entreprise(entreprise_id));

CREATE POLICY "Users can access fiches_transport_materiaux_lignes of their company"
ON fiches_transport_materiaux_lignes FOR ALL
USING (user_has_access_to_entreprise(entreprise_id))
WITH CHECK (user_has_access_to_entreprise(entreprise_id));

-- 5. Trigger pour entreprise_id automatique sur les lignes
CREATE OR REPLACE FUNCTION set_entreprise_from_fiche_transport_materiaux()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.entreprise_id IS NULL AND NEW.fiche_id IS NOT NULL THEN
    SELECT entreprise_id INTO NEW.entreprise_id
    FROM public.fiches_transport_materiaux WHERE id = NEW.fiche_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_set_entreprise_lignes_materiaux
BEFORE INSERT ON fiches_transport_materiaux_lignes
FOR EACH ROW
EXECUTE FUNCTION set_entreprise_from_fiche_transport_materiaux();

-- 6. Trigger pour updated_at automatique
CREATE TRIGGER update_fiches_transport_materiaux_updated_at
BEFORE UPDATE ON fiches_transport_materiaux
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();