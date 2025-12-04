import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TacheDocument {
  id: string;
  tache_id: string;
  nom: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export const useTacheDocuments = (tacheId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["tache-documents", tacheId],
    queryFn: async () => {
      if (!tacheId) return [];
      const { data, error } = await supabase
        .from("taches_documents")
        .select("*")
        .eq("tache_id", tacheId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TacheDocument[];
    },
    enabled: !!tacheId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, tacheId, chantierId }: { file: File; tacheId: string; chantierId?: string }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${tacheId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload file to taches-documents storage
      const { error: uploadError } = await supabase.storage
        .from("taches-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create database entry for tache document
      const { error: dbError } = await supabase.from("taches_documents").insert({
        tache_id: tacheId,
        nom: file.name,
        file_path: fileName,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user?.id,
      });

      if (dbError) throw dbError;

      // Also copy to chantier documents if chantierId is provided
      if (chantierId) {
        const chantierFileName = `${chantierId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload file to chantiers-documents storage
        const { error: chantierUploadError } = await supabase.storage
          .from("chantiers-documents")
          .upload(chantierFileName, file);

        if (chantierUploadError) {
          console.error("Error uploading to chantiers-documents:", chantierUploadError);
          // Don't fail the whole operation, just log the error
        } else {
          // Create database entry for chantier document
          const { error: chantierDbError } = await supabase.from("chantiers_documents").insert({
            chantier_id: chantierId,
            nom: file.name,
            file_path: chantierFileName,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user?.id,
          });

          if (chantierDbError) {
            console.error("Error inserting chantier document:", chantierDbError);
          }
        }
      }

      return { chantierId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tache-documents", tacheId] });
      // Also invalidate chantier documents cache if chantierId was provided
      if (data?.chantierId) {
        queryClient.invalidateQueries({ queryKey: ["chantier-documents", data.chantierId] });
      }
      toast.success("Fichier ajouté");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload");
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (document: TacheDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("taches-documents")
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete database entry
      const { error: dbError } = await supabase
        .from("taches_documents")
        .delete()
        .eq("id", document.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tache-documents", tacheId] });
      toast.success("Fichier supprimé");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    },
  });

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from("taches-documents")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  return {
    documents,
    isLoading,
    uploadDocument,
    deleteDocument,
    getPublicUrl,
  };
};
