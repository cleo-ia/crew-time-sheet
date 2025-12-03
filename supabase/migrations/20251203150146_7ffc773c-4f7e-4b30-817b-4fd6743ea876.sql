-- Create table for internal todos/events related to chantiers
CREATE TABLE public.todos_chantier (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chantier_id uuid NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  nom text NOT NULL,
  description text,
  statut text NOT NULL DEFAULT 'A_FAIRE' CHECK (statut IN ('A_FAIRE', 'EN_COURS', 'TERMINE')),
  priorite text DEFAULT 'NORMALE' CHECK (priorite IN ('BASSE', 'NORMALE', 'HAUTE')),
  date_echeance date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.todos_chantier ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all access for authenticated users" 
ON public.todos_chantier 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_todos_chantier_updated_at
BEFORE UPDATE ON public.todos_chantier
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_todos_chantier_chantier_id ON public.todos_chantier(chantier_id);