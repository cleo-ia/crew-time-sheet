import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface InventoryItem {
  id: string;
  entreprise_id: string;
  report_id: string;
  template_id: string | null;
  categorie: string;
  designation: string;
  unite: string;
  quantity_good: number;
  quantity_repair: number;
  quantity_broken: number;
  total: number;
  previous_total: number | null;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export function useInventoryItems(reportId: string | undefined) {
  return useQuery({
    queryKey: ["inventory-items", reportId],
    queryFn: async () => {
      if (!reportId) return [];

      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("report_id", reportId)
        .order("categorie", { ascending: true })
        .order("designation", { ascending: true });

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!reportId,
  });
}

export function useInventoryItemsByReportIds(reportIds: string[]) {
  return useQuery({
    queryKey: ["inventory-items-batch", reportIds],
    queryFn: async () => {
      if (reportIds.length === 0) return [];

      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .in("report_id", reportIds)
        .order("categorie", { ascending: true })
        .order("designation", { ascending: true });

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: reportIds.length > 0,
  });
}

export function useUpsertInventoryItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, items }: {
      reportId: string;
      items: Array<{
        id?: string;
        template_id?: string | null;
        categorie: string;
        designation: string;
        unite: string;
        quantity_good: number;
        quantity_repair: number;
        quantity_broken: number;
        previous_total: number | null;
        photos: string[];
      }>;
    }) => {
      const { error } = await supabase.rpc("upsert_inventory_items", {
        p_report_id: reportId,
        p_items: items.map(item => ({
          template_id: item.template_id || null,
          categorie: item.categorie,
          designation: item.designation,
          unite: item.unite,
          quantity_good: item.quantity_good,
          quantity_repair: item.quantity_repair,
          quantity_broken: item.quantity_broken,
          previous_total: item.previous_total,
          photos: item.photos,
        })),
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items", variables.reportId] });
      toast({ title: "Inventaire sauvegardé", description: "Les données ont été enregistrées." });
    },
    onError: (error) => {
      console.error("Upsert items error:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder l'inventaire.", variant: "destructive" });
    },
  });
}
