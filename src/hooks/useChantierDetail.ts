import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChantierDetail {
  id: string;
  nom: string;
  code_chantier: string | null;
  ville: string | null;
  adresse: string | null;
  client: string | null;
  description: string | null;
  actif: boolean | null;
  date_debut: string | null;
  date_fin: string | null;
  chef_id: string | null;
  conducteur_id: string | null;
  chef?: { nom: string | null; prenom: string | null } | null;
  conducteur?: { nom: string | null; prenom: string | null } | null;
  cover_image?: string | null;
}

export const useChantierDetail = (chantierId: string | undefined) => {
  return useQuery({
    queryKey: ["chantier-detail", chantierId],
    queryFn: async (): Promise<ChantierDetail | null> => {
      if (!chantierId) return null;

      // Fetch chantier with chef and conducteur info
      const { data: chantier, error } = await supabase
        .from("chantiers")
        .select(`
          *,
          chef:utilisateurs!chantiers_chef_id_fkey(nom, prenom),
          conducteur:utilisateurs!chantiers_conducteur_id_fkey(nom, prenom)
        `)
        .eq("id", chantierId)
        .maybeSingle();

      if (error) throw error;
      if (!chantier) return null;

      // Fetch first image document for cover
      const { data: coverDoc } = await supabase
        .from("chantiers_documents")
        .select("file_path")
        .eq("chantier_id", chantierId)
        .in("file_type", ["image/jpeg", "image/jpg", "image/png"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      let cover_image: string | null = null;
      if (coverDoc?.file_path) {
        const { data: urlData } = supabase.storage
          .from("chantiers-documents")
          .getPublicUrl(coverDoc.file_path);
        cover_image = urlData.publicUrl;
      }

      return {
        ...chantier,
        cover_image,
      };
    },
    enabled: !!chantierId,
  });
};
