-- Create table for purchases/achats
CREATE TABLE public.achats_chantier (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chantier_id UUID NOT NULL,
  tache_id UUID,
  nom TEXT NOT NULL,
  fournisseur TEXT,
  montant NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type_cout TEXT NOT NULL DEFAULT 'Matériaux',
  facture_path TEXT,
  facture_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achats_chantier ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all access for authenticated users"
ON public.achats_chantier
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_achats_chantier_updated_at
BEFORE UPDATE ON public.achats_chantier
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();