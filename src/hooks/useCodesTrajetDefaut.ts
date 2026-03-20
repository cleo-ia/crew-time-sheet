import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmployeTerrain {
  id: string;
  nom: string | null;
  prenom: string | null;
  role_metier: string | null;
}

interface CodeTrajetRow {
  chantier_id: string;
  salarie_id: string;
  code_trajet: string;
}

// Requête dédiée — indépendante de useAllEmployes
export const useEmployesTerrain = () => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["codes-trajet-employes", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return [];

      const { data, error } = await supabase
        .from("utilisateurs")
        .select("id, nom, prenom, role_metier")
        .eq("entreprise_id", entrepriseId)
        .in("role_metier", ["chef", "macon", "grutier", "finisseur"])
        .order("nom")
        .order("prenom");

      if (error) throw error;
      return (data ?? []) as EmployeTerrain[];
    },
    enabled: !!entrepriseId,
  });
};

// Mappings codes trajet par défaut — utilise rpc/rest direct car table pas dans types.ts
export const useCodesTrajetDefaut = () => {
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useQuery({
    queryKey: ["codes-trajet-defaut", entrepriseId],
    queryFn: async () => {
      if (!entrepriseId) return new Map<string, string>();

      const { data, error } = await supabase
        .from("codes_trajet_defaut" as any)
        .select("chantier_id, salarie_id, code_trajet")
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      const map = new Map<string, string>();
      for (const row of (data ?? []) as unknown as CodeTrajetRow[]) {
        map.set(`${row.chantier_id}_${row.salarie_id}`, row.code_trajet);
      }
      return map;
    },
    enabled: !!entrepriseId,
  });
};

// Mutation upsert
export const useUpsertCodeTrajet = () => {
  const queryClient = useQueryClient();
  const entrepriseId = localStorage.getItem("current_entreprise_id");

  return useMutation({
    mutationFn: async ({
      chantierId,
      salarieId,
      codeTrajet,
    }: {
      chantierId: string;
      salarieId: string;
      codeTrajet: string | null;
    }) => {
      if (!entrepriseId) throw new Error("Pas d'entreprise sélectionnée");

      // "_NON_DEFINI" / null → supprimer la ligne en base
      if (!codeTrajet || codeTrajet === "_NON_DEFINI") {
        const { error } = await supabase
          .from("codes_trajet_defaut" as any)
          .delete()
          .eq("entreprise_id", entrepriseId)
          .eq("chantier_id", chantierId)
          .eq("salarie_id", salarieId);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("codes_trajet_defaut" as any)
        .upsert(
          {
            entreprise_id: entrepriseId,
            chantier_id: chantierId,
            salarie_id: salarieId,
            code_trajet: codeTrajet,
          },
          { onConflict: "entreprise_id,chantier_id,salarie_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["codes-trajet-defaut"] });
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
};
