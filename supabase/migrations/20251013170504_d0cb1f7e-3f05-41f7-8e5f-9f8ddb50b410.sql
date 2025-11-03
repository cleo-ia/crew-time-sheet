-- Create table for closed periods
CREATE TABLE periodes_cloturees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periode TEXT NOT NULL,
  semaine_debut TEXT NOT NULL,
  semaine_fin TEXT,
  date_cloture TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  cloturee_par UUID REFERENCES utilisateurs(id),
  nb_salaries INTEGER DEFAULT 0,
  nb_fiches INTEGER DEFAULT 0,
  total_heures NUMERIC(10,2) DEFAULT 0,
  motif TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE TRIGGER update_periodes_cloturees_updated_at
  BEFORE UPDATE ON periodes_cloturees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE periodes_cloturees ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Enable all access for development" ON periodes_cloturees
  FOR ALL USING (true) WITH CHECK (true);