-- Création des types ENUM pour les demandes de congés
CREATE TYPE public.type_conge AS ENUM ('CP', 'RTT', 'MALADIE', 'AUTRE');
CREATE TYPE public.statut_demande_conge AS ENUM ('EN_ATTENTE', 'VALIDEE_CONDUCTEUR', 'VALIDEE_RH', 'REFUSEE');

-- Création de la table demandes_conges
CREATE TABLE public.demandes_conges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demandeur_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  type_conge public.type_conge NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  motif TEXT,
  statut public.statut_demande_conge NOT NULL DEFAULT 'EN_ATTENTE',
  validee_par_conducteur_id UUID REFERENCES public.utilisateurs(id),
  validee_par_conducteur_at TIMESTAMPTZ,
  validee_par_rh_id UUID REFERENCES public.utilisateurs(id),
  validee_par_rh_at TIMESTAMPTZ,
  refusee_par_id UUID REFERENCES public.utilisateurs(id),
  refusee_par_at TIMESTAMPTZ,
  motif_refus TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger pour updated_at
CREATE TRIGGER update_demandes_conges_updated_at
  BEFORE UPDATE ON public.demandes_conges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Activer RLS
ALTER TABLE public.demandes_conges ENABLE ROW LEVEL SECURITY;

-- Index pour les performances
CREATE INDEX idx_demandes_conges_demandeur ON public.demandes_conges(demandeur_id);
CREATE INDEX idx_demandes_conges_entreprise ON public.demandes_conges(entreprise_id);
CREATE INDEX idx_demandes_conges_statut ON public.demandes_conges(statut);

-- Politique RLS : Les chefs peuvent voir leurs propres demandes
CREATE POLICY "Chefs can view own demandes"
  ON public.demandes_conges
  FOR SELECT
  TO authenticated
  USING (
    demandeur_id IN (
      SELECT id FROM public.utilisateurs 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Politique RLS : Les chefs peuvent créer leurs propres demandes
CREATE POLICY "Chefs can create own demandes"
  ON public.demandes_conges
  FOR INSERT
  TO authenticated
  WITH CHECK (
    demandeur_id IN (
      SELECT id FROM public.utilisateurs 
      WHERE auth_user_id = auth.uid()
    )
    AND entreprise_id = public.get_user_entreprise_id()
  );

-- Politique RLS : Les conducteurs peuvent voir les demandes de leurs chefs
CREATE POLICY "Conducteurs can view chefs demandes"
  ON public.demandes_conges
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conducteurs_chefs cc
      JOIN public.utilisateurs u ON u.auth_user_id = cc.conducteur_id
      WHERE u.auth_user_id = auth.uid()
        AND cc.chef_id IN (
          SELECT auth_user_id FROM public.utilisateurs WHERE id = demandes_conges.demandeur_id
        )
    )
  );

-- Politique RLS : Les conducteurs peuvent mettre à jour les demandes de leurs chefs
CREATE POLICY "Conducteurs can update chefs demandes"
  ON public.demandes_conges
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conducteurs_chefs cc
      JOIN public.utilisateurs u ON u.auth_user_id = cc.conducteur_id
      WHERE u.auth_user_id = auth.uid()
        AND cc.chef_id IN (
          SELECT auth_user_id FROM public.utilisateurs WHERE id = demandes_conges.demandeur_id
        )
    )
  );

-- Politique RLS : Les RH peuvent voir toutes les demandes de leur entreprise
CREATE POLICY "RH can view all demandes"
  ON public.demandes_conges
  FOR SELECT
  TO authenticated
  USING (
    entreprise_id = public.get_user_entreprise_id()
    AND public.has_role(auth.uid(), 'rh')
  );

-- Politique RLS : Les RH peuvent mettre à jour toutes les demandes de leur entreprise
CREATE POLICY "RH can update all demandes"
  ON public.demandes_conges
  FOR UPDATE
  TO authenticated
  USING (
    entreprise_id = public.get_user_entreprise_id()
    AND public.has_role(auth.uid(), 'rh')
  );

-- Politique RLS : Les admins peuvent tout voir
CREATE POLICY "Admins can view all demandes"
  ON public.demandes_conges
  FOR SELECT
  TO authenticated
  USING (
    entreprise_id = public.get_user_entreprise_id()
    AND public.has_role(auth.uid(), 'admin')
  );

-- Politique RLS : Les admins peuvent tout modifier
CREATE POLICY "Admins can update all demandes"
  ON public.demandes_conges
  FOR UPDATE
  TO authenticated
  USING (
    entreprise_id = public.get_user_entreprise_id()
    AND public.has_role(auth.uid(), 'admin')
  );