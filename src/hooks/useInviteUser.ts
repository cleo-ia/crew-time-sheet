import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InviteUserParams {
  email: string;
  role: "admin" | "gestionnaire" | "rh" | "conducteur" | "chef";
  conducteur_id?: string;
  entreprise_id?: string;
}

export const useInviteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role, conducteur_id, entreprise_id }: InviteUserParams) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email, role, conducteur_id, entreprise_id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Invitation envoyée avec succès");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (error: any) => {
      console.error("Error inviting user:", error);
      const message = error?.message || "Erreur lors de l'envoi de l'invitation";
      toast.error(message);
    },
  });
};