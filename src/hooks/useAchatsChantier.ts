import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Achat {
  id: string;
  chantier_id: string;
  tache_id: string | null;
  nom: string;
  fournisseur: string | null;
  montant: number;
  date: string;
  type_cout: string;
  unite: string | null;
  facture_path: string | null;
  facture_name: string | null;
  created_at: string;
  updated_at: string;
}

export type AchatInsert = Omit<Achat, "id" | "created_at" | "updated_at">;
export type AchatUpdate = Partial<AchatInsert>;

export const useAchatsChantier = (chantierId: string) => {
  return useQuery({
    queryKey: ["achats-chantier", chantierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achats_chantier")
        .select("*")
        .eq("chantier_id", chantierId)
        .order("date", { ascending: false });

      if (error) throw error;
      return data as Achat[];
    },
    enabled: !!chantierId,
  });
};

export const useCreateAchat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (achat: AchatInsert) => {
      const { data, error } = await supabase
        .from("achats_chantier")
        .insert(achat)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["achats-chantier", data.chantier_id] });
      toast.success("Achat ajouté");
    },
    onError: (error) => {
      console.error("Error creating achat:", error);
      toast.error("Erreur lors de l'ajout de l'achat");
    },
  });
};

export const useUpdateAchat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, chantierId, updates }: { id: string; chantierId: string; updates: AchatUpdate }) => {
      const { data, error } = await supabase
        .from("achats_chantier")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, chantierId };
    },
    onSuccess: ({ chantierId }) => {
      queryClient.invalidateQueries({ queryKey: ["achats-chantier", chantierId] });
      toast.success("Achat modifié");
    },
    onError: (error) => {
      console.error("Error updating achat:", error);
      toast.error("Erreur lors de la modification de l'achat");
    },
  });
};

export const useDeleteAchat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, chantierId }: { id: string; chantierId: string }) => {
      const { error } = await supabase
        .from("achats_chantier")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { chantierId };
    },
    onSuccess: ({ chantierId }) => {
      queryClient.invalidateQueries({ queryKey: ["achats-chantier", chantierId] });
      toast.success("Achat supprimé");
    },
    onError: (error) => {
      console.error("Error deleting achat:", error);
      toast.error("Erreur lors de la suppression de l'achat");
    },
  });
};
