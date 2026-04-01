
-- ==============================================
-- TABLE 1 : inventory_templates (catalogue matériel)
-- ==============================================
CREATE TABLE public.inventory_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL,
  designation TEXT NOT NULL,
  unite TEXT NOT NULL DEFAULT 'U',
  ordre INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory templates of their entreprise"
  ON public.inventory_templates FOR SELECT
  TO authenticated
  USING (entreprise_id = public.get_selected_entreprise_id());

CREATE POLICY "Users can insert inventory templates in their entreprise"
  ON public.inventory_templates FOR INSERT
  TO authenticated
  WITH CHECK (entreprise_id = public.get_selected_entreprise_id());

CREATE POLICY "Users can update inventory templates in their entreprise"
  ON public.inventory_templates FOR UPDATE
  TO authenticated
  USING (entreprise_id = public.get_selected_entreprise_id());

CREATE POLICY "Users can delete inventory templates in their entreprise"
  ON public.inventory_templates FOR DELETE
  TO authenticated
  USING (entreprise_id = public.get_selected_entreprise_id());

CREATE TRIGGER update_inventory_templates_updated_at
  BEFORE UPDATE ON public.inventory_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- TABLE 2 : inventory_reports (rapport mensuel)
-- ==============================================
CREATE TABLE public.inventory_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  mois TEXT NOT NULL, -- format '2026-04'
  statut TEXT NOT NULL DEFAULT 'BROUILLON' CHECK (statut IN ('BROUILLON', 'TRANSMIS')),
  created_by UUID REFERENCES auth.users(id),
  signature_data TEXT,
  transmitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chantier_id, mois)
);

ALTER TABLE public.inventory_reports ENABLE ROW LEVEL SECURITY;

-- Trigger pour auto-remplir entreprise_id depuis chantier
CREATE TRIGGER tr_inventory_reports_set_entreprise
  BEFORE INSERT ON public.inventory_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_entreprise_from_chantier();

CREATE POLICY "Users can view inventory reports of their entreprise"
  ON public.inventory_reports FOR SELECT
  TO authenticated
  USING (entreprise_id = public.get_selected_entreprise_id());

CREATE POLICY "Users can insert inventory reports in their entreprise"
  ON public.inventory_reports FOR INSERT
  TO authenticated
  WITH CHECK (true); -- entreprise_id set by trigger

CREATE POLICY "Users can update inventory reports in their entreprise"
  ON public.inventory_reports FOR UPDATE
  TO authenticated
  USING (entreprise_id = public.get_selected_entreprise_id());

CREATE TRIGGER update_inventory_reports_updated_at
  BEFORE UPDATE ON public.inventory_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- TABLE 3 : inventory_items (lignes d'inventaire)
-- ==============================================
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.inventory_reports(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.inventory_templates(id) ON DELETE SET NULL,
  categorie TEXT NOT NULL,
  designation TEXT NOT NULL,
  unite TEXT NOT NULL DEFAULT 'U',
  quantity_good INTEGER NOT NULL DEFAULT 0,
  quantity_repair INTEGER NOT NULL DEFAULT 0,
  quantity_broken INTEGER NOT NULL DEFAULT 0,
  total INTEGER GENERATED ALWAYS AS (quantity_good + quantity_repair + quantity_broken) STORED,
  previous_total INTEGER,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Trigger pour auto-remplir entreprise_id depuis report
CREATE OR REPLACE FUNCTION public.set_entreprise_from_inventory_report()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.entreprise_id IS NULL AND NEW.report_id IS NOT NULL THEN
    SELECT entreprise_id INTO NEW.entreprise_id
    FROM public.inventory_reports WHERE id = NEW.report_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_inventory_items_set_entreprise
  BEFORE INSERT ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_entreprise_from_inventory_report();

CREATE POLICY "Users can view inventory items of their entreprise"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (entreprise_id = public.get_selected_entreprise_id());

CREATE POLICY "Users can insert inventory items in their entreprise"
  ON public.inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (true); -- entreprise_id set by trigger

CREATE POLICY "Users can update inventory items in their entreprise"
  ON public.inventory_items FOR UPDATE
  TO authenticated
  USING (entreprise_id = public.get_selected_entreprise_id());

CREATE POLICY "Users can delete inventory items in their entreprise"
  ON public.inventory_items FOR DELETE
  TO authenticated
  USING (entreprise_id = public.get_selected_entreprise_id());

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- INDEXES
-- ==============================================
CREATE INDEX idx_inventory_templates_entreprise ON public.inventory_templates(entreprise_id);
CREATE INDEX idx_inventory_reports_chantier_mois ON public.inventory_reports(chantier_id, mois);
CREATE INDEX idx_inventory_reports_entreprise ON public.inventory_reports(entreprise_id);
CREATE INDEX idx_inventory_items_report ON public.inventory_items(report_id);

-- ==============================================
-- STORAGE BUCKET : inventory-photos
-- ==============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-photos', 'inventory-photos', true);

CREATE POLICY "Inventory photos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inventory-photos');

CREATE POLICY "Authenticated users can upload inventory photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inventory-photos');

CREATE POLICY "Authenticated users can update inventory photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'inventory-photos');

CREATE POLICY "Authenticated users can delete inventory photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'inventory-photos');
