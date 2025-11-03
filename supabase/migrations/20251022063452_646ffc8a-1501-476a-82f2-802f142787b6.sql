-- Table pour les fiches de transport individuelles des finisseurs
CREATE TABLE fiches_transport_finisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_id UUID NOT NULL REFERENCES fiches(id) ON DELETE CASCADE,
  finisseur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  semaine TEXT NOT NULL,
  immatriculation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fiche_id, finisseur_id)
);

-- Table pour les détails jour par jour (5 jours)
CREATE TABLE fiches_transport_finisseurs_jours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_transport_finisseur_id UUID NOT NULL REFERENCES fiches_transport_finisseurs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  conducteur_matin_id UUID REFERENCES utilisateurs(id),
  conducteur_soir_id UUID REFERENCES utilisateurs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX idx_fiche_transport_finisseurs_fiche ON fiches_transport_finisseurs(fiche_id);
CREATE INDEX idx_fiche_transport_finisseurs_finisseur ON fiches_transport_finisseurs(finisseur_id);
CREATE INDEX idx_fiche_transport_finisseurs_jours_fiche ON fiches_transport_finisseurs_jours(fiche_transport_finisseur_id);

-- RLS policies
ALTER TABLE fiches_transport_finisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiches_transport_finisseurs_jours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for development" ON fiches_transport_finisseurs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON fiches_transport_finisseurs_jours FOR ALL USING (true) WITH CHECK (true);

-- Trigger pour updated_at
CREATE TRIGGER update_fiches_transport_finisseurs_updated_at
  BEFORE UPDATE ON fiches_transport_finisseurs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fiches_transport_finisseurs_jours_updated_at
  BEFORE UPDATE ON fiches_transport_finisseurs_jours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();