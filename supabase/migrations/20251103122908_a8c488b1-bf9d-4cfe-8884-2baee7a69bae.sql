-- Ajouter les colonnes contractuelles à la table utilisateurs
ALTER TABLE public.utilisateurs 
  ADD COLUMN IF NOT EXISTS matricule TEXT,
  ADD COLUMN IF NOT EXISTS echelon TEXT,
  ADD COLUMN IF NOT EXISTS niveau TEXT,
  ADD COLUMN IF NOT EXISTS degre TEXT,
  ADD COLUMN IF NOT EXISTS statut TEXT,
  ADD COLUMN IF NOT EXISTS type_contrat TEXT,
  ADD COLUMN IF NOT EXISTS horaire TEXT,
  ADD COLUMN IF NOT EXISTS heures_supp_mensualisees NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forfait_jours BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS salaire NUMERIC(10,2);

COMMENT ON COLUMN public.utilisateurs.matricule IS 'Matricule de l''employé';
COMMENT ON COLUMN public.utilisateurs.echelon IS 'Échelon (A, B, C...)';
COMMENT ON COLUMN public.utilisateurs.niveau IS 'Niveau (I, II, III...)';
COMMENT ON COLUMN public.utilisateurs.degre IS 'Degré (1, 2, 3...)';
COMMENT ON COLUMN public.utilisateurs.statut IS 'Statut: ETAM, Ouvrier, Cadre';
COMMENT ON COLUMN public.utilisateurs.type_contrat IS 'Type de contrat: CDI, CDD, Intérim';
COMMENT ON COLUMN public.utilisateurs.horaire IS 'Horaire: Horaire, Forfait jours';
COMMENT ON COLUMN public.utilisateurs.heures_supp_mensualisees IS 'Nombre d''heures supplémentaires mensualisées';
COMMENT ON COLUMN public.utilisateurs.forfait_jours IS 'Indique si l''employé est en forfait jours';
COMMENT ON COLUMN public.utilisateurs.salaire IS 'Salaire de base de l''employé';