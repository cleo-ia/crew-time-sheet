import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ChantierDocument {
  id: string;
  chantier_id: string;
  nom: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
}

export function useChantierDocuments(chantierId: string | null) {
  return useQuery({
    queryKey: ["chantier-documents", chantierId],
    queryFn: async () => {
      if (!chantierId) return [];
      
      const { data, error } = await supabase
        .from("chantiers_documents")
        .select("*")
        .eq("chantier_id", chantierId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ChantierDocument[];
    },
    enabled: !!chantierId,
  });
}

export function useUploadChantierDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chantierId,
      file,
    }: {
      chantierId: string;
      file: File;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${chantierId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("chantiers-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { data, error: dbError } = await supabase
        .from("chantiers_documents")
        .insert({
          chantier_id: chantierId,
          nom: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id || null,
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if db insert fails
        await supabase.storage.from("chantiers-documents").remove([fileName]);
        throw dbError;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chantier-documents", variables.chantierId] });
      toast({
        title: "Document ajouté",
        description: "Le document a été uploadé avec succès.",
      });
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader le document.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteChantierDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ document }: { document: ChantierDocument }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("chantiers-documents")
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("chantiers_documents")
        .delete()
        .eq("id", document.id);

      if (dbError) throw dbError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chantier-documents", variables.document.chantier_id] });
      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès.",
      });
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document.",
        variant: "destructive",
      });
    },
  });
}

export function getDocumentUrl(filePath: string): string {
  const { data } = supabase.storage
    .from("chantiers-documents")
    .getPublicUrl(filePath);
  return data.publicUrl;
}
