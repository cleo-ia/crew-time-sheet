import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SaveSignatureParams {
  ficheId: string;
  userId: string; // ID du maçon qui signe
  role?: string;
  signatureData: string;
}

export const useSaveSignature = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveSignatureParams) => {
      const { ficheId, userId, role, signatureData } = params;

      // Supprimer l'ancienne signature si elle existe
      await supabase
        .from("signatures")
        .delete()
        .eq("fiche_id", ficheId)
        .eq("signed_by", userId);

      // Préparer les données d'insertion
      const insertData: any = {
        fiche_id: ficheId,
        signed_by: userId,
        signature_data: signatureData,
      };

      // N'ajouter le role que s'il fait partie de app_role (chef, conducteur, admin, rh)
      if (role && ['chef', 'conducteur', 'admin', 'rh'].includes(role)) {
        insertData.role = role;
      }

      // Insérer la nouvelle signature
      const { data, error } = await supabase
        .from("signatures")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // TODO: Sauvegarder signatureData dans le storage Supabase si nécessaire
      // Pour l'instant, on stocke juste l'enregistrement dans la table signatures

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["macons-chantier"] });
      toast({
        title: "Signature enregistrée",
        description: "La signature a été enregistrée avec succès.",
      });
    },
    onError: (error) => {
      console.error("Error saving signature:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement de la signature.",
        variant: "destructive",
      });
    },
  });
};
