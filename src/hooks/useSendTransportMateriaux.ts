import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SendTransportMateriauxParams {
  ficheId: string;
}

export const useSendTransportMateriaux = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ficheId }: SendTransportMateriauxParams) => {
      const { data, error } = await supabase.functions.invoke("send-transport-materiaux", {
        body: { ficheId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiches-transport-materiaux"] });
      toast({
        title: "✅ Fiche transmise",
        description: "La demande de transport matériaux a été envoyée au dépôt par email.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "❌ Erreur d'envoi",
        description: error.message || "Impossible d'envoyer la fiche au dépôt.",
      });
    },
  });
};
