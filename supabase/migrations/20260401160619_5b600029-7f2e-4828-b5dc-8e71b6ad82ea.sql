CREATE OR REPLACE FUNCTION public.upsert_inventory_items(
  p_report_id uuid,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Supprimer les items existants
  DELETE FROM public.inventory_items WHERE report_id = p_report_id;

  -- Insérer les nouveaux items
  IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) > 0 THEN
    INSERT INTO public.inventory_items (
      report_id, entreprise_id, template_id, categorie,
      designation, unite, quantity_good, quantity_repair,
      quantity_broken, previous_total, photos
    )
    SELECT
      p_report_id,
      (SELECT entreprise_id FROM public.inventory_reports WHERE id = p_report_id),
      (elem->>'template_id')::uuid,
      elem->>'categorie',
      elem->>'designation',
      elem->>'unite',
      (elem->>'quantity_good')::int,
      (elem->>'quantity_repair')::int,
      (elem->>'quantity_broken')::int,
      (elem->>'previous_total')::int,
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(elem->'photos', '[]'::jsonb)))
    FROM jsonb_array_elements(p_items) AS elem;
  END IF;
END;
$$;