-- Migration : Simplification de la table affectations (Option A - Chef fixe par chantier)
-- Le chef est désormais uniquement défini dans chantiers.chef_id

-- 1. Sauvegarder les données existantes
CREATE TABLE IF NOT EXISTS public.affectations_backup AS 
SELECT * FROM public.affectations;

-- 2. Supprimer l'ancienne table et la vue
DROP VIEW IF EXISTS public.affectations_view CASCADE;
DROP TABLE IF EXISTS public.affectations CASCADE;

-- 3. Recréer la table affectations SANS chef_id
CREATE TABLE public.affectations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  macon_id uuid NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  chantier_id uuid NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  date_debut date NOT NULL,
  date_fin date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Contrainte : un maçon ne peut avoir qu'une seule affectation active par période
  UNIQUE(macon_id, chantier_id, date_debut)
);

-- 4. Créer les index pour optimiser les requêtes
CREATE INDEX idx_affectations_macon ON public.affectations(macon_id);
CREATE INDEX idx_affectations_chantier ON public.affectations(chantier_id);
CREATE INDEX idx_affectations_active ON public.affectations(macon_id, chantier_id) 
  WHERE date_fin IS NULL;

-- 5. Trigger pour updated_at
CREATE TRIGGER update_affectations_updated_at
  BEFORE UPDATE ON public.affectations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Activer RLS avec politique temporaire pour le développement
ALTER TABLE public.affectations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for development"
  ON public.affectations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Recréer la vue affectations_view avec le chef déduit du chantier
CREATE OR REPLACE VIEW public.affectations_view AS
SELECT 
  a.id,
  a.macon_id,
  a.chantier_id,
  a.date_debut,
  a.date_fin,
  a.created_at,
  a.updated_at,
  
  -- Informations du maçon
  macon.nom AS macon_nom,
  macon.prenom AS macon_prenom,
  macon.email AS macon_email,
  
  -- Informations du chantier
  c.nom AS chantier_nom,
  c.code_chantier,
  c.ville,
  
  -- Chef déduit du chantier (via chantiers.chef_id)
  c.chef_id,
  chef.nom AS chef_nom,
  chef.prenom AS chef_prenom
  
FROM public.affectations a
JOIN public.utilisateurs macon ON a.macon_id = macon.id
JOIN public.chantiers c ON a.chantier_id = c.id
LEFT JOIN public.utilisateurs chef ON c.chef_id = chef.id;

-- 8. Restaurer les données depuis la sauvegarde (sans chef_id)
INSERT INTO public.affectations (id, macon_id, chantier_id, date_debut, date_fin, created_at, updated_at)
SELECT id, macon_id, chantier_id, date_debut, date_fin, created_at, updated_at
FROM public.affectations_backup
ON CONFLICT (macon_id, chantier_id, date_debut) DO NOTHING;