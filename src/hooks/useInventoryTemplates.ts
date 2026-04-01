import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface InventoryTemplate {
  id: string;
  entreprise_id: string;
  categorie: string;
  designation: string;
  unite: string;
  ordre: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useInventoryTemplates() {
  return useQuery({
    queryKey: ["inventory-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_templates")
        .select("*")
        .order("categorie", { ascending: true })
        .order("ordre", { ascending: true });

      if (error) throw error;
      return data as InventoryTemplate[];
    },
  });
}

export function useCreateInventoryTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: { categorie: string; designation: string; unite: string; ordre?: number }) => {
      const entrepriseId = localStorage.getItem("current_entreprise_id");
      if (!entrepriseId) throw new Error("Entreprise non définie");

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("inventory_templates")
        .insert({
          entreprise_id: entrepriseId,
          categorie: template.categorie,
          designation: template.designation,
          unite: template.unite,
          ordre: template.ordre ?? 0,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-templates"] });
      toast({ title: "Article ajouté", description: "L'article a été ajouté au catalogue." });
    },
    onError: (error) => {
      console.error("Create template error:", error);
      toast({ title: "Erreur", description: "Impossible d'ajouter l'article.", variant: "destructive" });
    },
  });
}

export function useUpdateInventoryTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; categorie?: string; designation?: string; unite?: string; ordre?: number }) => {
      const { error } = await supabase
        .from("inventory_templates")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-templates"] });
    },
    onError: (error) => {
      console.error("Update template error:", error);
      toast({ title: "Erreur", description: "Impossible de modifier l'article.", variant: "destructive" });
    },
  });
}

export function useDeleteInventoryTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inventory_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-templates"] });
      toast({ title: "Article supprimé", description: "L'article a été retiré du catalogue." });
    },
    onError: (error) => {
      console.error("Delete template error:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer l'article.", variant: "destructive" });
    },
  });
}
