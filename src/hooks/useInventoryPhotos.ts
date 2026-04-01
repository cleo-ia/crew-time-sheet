import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useUploadInventoryPhoto() {
  return useMutation({
    mutationFn: async ({ reportId, file }: { reportId: string; file: File }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${reportId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("inventory-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("inventory-photos")
        .getPublicUrl(fileName);

      return data.publicUrl;
    },
    onError: (error) => {
      console.error("Upload photo error:", error);
      toast({ title: "Erreur", description: "Impossible d'uploader la photo.", variant: "destructive" });
    },
  });
}

export function useDeleteInventoryPhoto() {
  return useMutation({
    mutationFn: async (photoUrl: string) => {
      // Extract file path from URL
      const url = new URL(photoUrl);
      const pathParts = url.pathname.split("/inventory-photos/");
      if (pathParts.length < 2) throw new Error("Invalid photo URL");
      
      const filePath = decodeURIComponent(pathParts[1]);
      
      const { error } = await supabase.storage
        .from("inventory-photos")
        .remove([filePath]);

      if (error) throw error;
    },
    onError: (error) => {
      console.error("Delete photo error:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer la photo.", variant: "destructive" });
    },
  });
}

export function getInventoryPhotoUrl(filePath: string): string {
  const { data } = supabase.storage
    .from("inventory-photos")
    .getPublicUrl(filePath);
  return data.publicUrl;
}
