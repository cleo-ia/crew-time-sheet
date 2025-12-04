-- Create "Factures" folder for all existing chantiers that don't have one
INSERT INTO public.chantiers_dossiers (chantier_id, nom, parent_id)
SELECT c.id, 'Factures', NULL
FROM public.chantiers c
WHERE NOT EXISTS (
  SELECT 1 FROM public.chantiers_dossiers cd 
  WHERE cd.chantier_id = c.id AND cd.nom = 'Factures' AND cd.parent_id IS NULL
);

-- Create function to automatically create "Factures" folder for new chantiers
CREATE OR REPLACE FUNCTION public.create_default_factures_folder()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chantiers_dossiers (chantier_id, nom, parent_id)
  VALUES (NEW.id, 'Factures', NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on chantiers table
CREATE TRIGGER trg_create_factures_folder
AFTER INSERT ON public.chantiers
FOR EACH ROW
EXECUTE FUNCTION public.create_default_factures_folder();