import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TodoDocument {
  id: string;
  todo_id: string;
  nom: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export const useTodoDocuments = (todoId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["todo-documents", todoId],
    queryFn: async () => {
      if (!todoId) return [];
      const { data, error } = await supabase
        .from("todos_documents")
        .select("*")
        .eq("todo_id", todoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TodoDocument[];
    },
    enabled: !!todoId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, todoId, chantierId }: { file: File; todoId: string; chantierId?: string }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${todoId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload file to todos-documents storage
      const { error: uploadError } = await supabase.storage
        .from("todos-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create database entry for todo document
      const { error: dbError } = await supabase.from("todos_documents").insert({
        todo_id: todoId,
        nom: file.name,
        file_path: fileName,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user?.id,
      });

      if (dbError) throw dbError;

      // Also copy to chantier documents if chantierId is provided (avoid duplicates)
      if (chantierId) {
        // Check if document with same name already exists for this chantier
        const { data: existingDoc } = await supabase
          .from("chantiers_documents")
          .select("id")
          .eq("chantier_id", chantierId)
          .eq("nom", file.name)
          .maybeSingle();

        // Only copy if document doesn't already exist
        if (!existingDoc) {
          const chantierFileName = `${chantierId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          // Upload file to chantiers-documents storage
          const { error: chantierUploadError } = await supabase.storage
            .from("chantiers-documents")
            .upload(chantierFileName, file);

          if (chantierUploadError) {
            console.error("Error uploading to chantiers-documents:", chantierUploadError);
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
      }

      return { chantierId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["todo-documents", todoId] });
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
    mutationFn: async (document: TodoDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("todos-documents")
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete database entry
      const { error: dbError } = await supabase
        .from("todos_documents")
        .delete()
        .eq("id", document.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todo-documents", todoId] });
      toast.success("Fichier supprimé");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    },
  });

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from("todos-documents")
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

// Helper to upload documents after todo creation
export const uploadTodoDocuments = async (todoId: string, files: File[], chantierId?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  for (const file of files) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${todoId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("todos-documents")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase.from("todos_documents").insert({
      todo_id: todoId,
      nom: file.name,
      file_path: fileName,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: user?.id,
    });

    if (dbError) throw dbError;

    // Also copy to chantier documents if chantierId is provided (avoid duplicates)
    if (chantierId) {
      // Check if document with same name already exists for this chantier
      const { data: existingDoc } = await supabase
        .from("chantiers_documents")
        .select("id")
        .eq("chantier_id", chantierId)
        .eq("nom", file.name)
        .maybeSingle();

      // Only copy if document doesn't already exist
      if (!existingDoc) {
        const chantierFileName = `${chantierId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: chantierUploadError } = await supabase.storage
          .from("chantiers-documents")
          .upload(chantierFileName, file);

        if (chantierUploadError) {
          console.error("Error uploading to chantiers-documents:", chantierUploadError);
        } else {
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
    }
  }
};
