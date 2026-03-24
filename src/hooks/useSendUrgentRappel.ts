import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SendUrgentRappelParams {
  targetUserId: string;
  targetRole: "chef" | "conducteur";
  semaine: string;
  chantierNom: string;
  teamCount: number;
}

export const useSendUrgentRappel = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: SendUrgentRappelParams) => {
      const { data, error } = await supabase.functions.invoke("rappel-urgence-export", {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (_data, variables) => {
      const role = variables.targetRole === "chef" ? "au chef" : "au conducteur";
      toast({
        title: "✅ Rappel urgent envoyé",
        description: `L'email de rappel a été envoyé ${role}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "❌ Erreur d'envoi",
        description: error.message || "Impossible d'envoyer le rappel urgent.",
      });
    },
  });
};
