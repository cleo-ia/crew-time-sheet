import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface InventoryReport {
  id: string;
  entreprise_id: string;
  chantier_id: string;
  mois: string;
  statut: "BROUILLON" | "TRANSMIS";
  created_by: string | null;
  signature_data: string | null;
  transmitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useInventoryReport(chantierId: string | undefined, mois: string) {
  return useQuery({
    queryKey: ["inventory-report", chantierId, mois],
    queryFn: async () => {
      if (!chantierId) return null;

      const { data, error } = await supabase
        .from("inventory_reports")
        .select("*")
        .eq("chantier_id", chantierId)
        .eq("mois", mois)
        .maybeSingle();

      if (error) throw error;
      return data as InventoryReport | null;
    },
    enabled: !!chantierId && !!mois,
  });
}

export function useInventoryReportPreviousMonth(chantierId: string | undefined, previousMois: string) {
  return useQuery({
    queryKey: ["inventory-report", chantierId, previousMois],
    queryFn: async () => {
      if (!chantierId) return null;

      const { data, error } = await supabase
        .from("inventory_reports")
        .select("*")
        .eq("chantier_id", chantierId)
        .eq("mois", previousMois)
        .maybeSingle();

      if (error) throw error;
      return data as InventoryReport | null;
    },
    enabled: !!chantierId && !!previousMois,
  });
}

export function useInventoryReportsAll() {
  return useQuery({
    queryKey: ["inventory-reports-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_reports")
        .select("*")
        .order("mois", { ascending: false });

      if (error) throw error;
      return data as InventoryReport[];
    },
  });
}

export function useCreateInventoryReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chantierId, mois }: { chantierId: string; mois: string }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("inventory_reports")
        .insert({
          chantier_id: chantierId,
          mois,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InventoryReport;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-report", data.chantier_id, data.mois] });
      queryClient.invalidateQueries({ queryKey: ["inventory-reports-all"] });
    },
    onError: (error) => {
      console.error("Create report error:", error);
      toast({ title: "Erreur", description: "Impossible de créer le rapport d'inventaire.", variant: "destructive" });
    },
  });
}

export function useTransmitInventoryReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, signatureData }: { reportId: string; signatureData: string }) => {
      const { error } = await supabase
        .from("inventory_reports")
        .update({
          statut: "TRANSMIS",
          signature_data: signatureData,
          transmitted_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-report"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-reports-all"] });
      toast({ title: "Inventaire transmis", description: "L'inventaire a été transmis au conducteur de travaux." });
    },
    onError: (error) => {
      console.error("Transmit report error:", error);
      toast({ title: "Erreur", description: "Impossible de transmettre l'inventaire.", variant: "destructive" });
    },
  });
}
