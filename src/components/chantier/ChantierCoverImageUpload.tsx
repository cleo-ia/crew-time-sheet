import { useState, useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ChantierCoverImageUploadProps {
  chantierId: string;
  currentImageUrl?: string | null;
  onImageUploaded?: (url: string) => void;
}

export const ChantierCoverImageUpload = ({
  chantierId,
  currentImageUrl,
  onImageUploaded,
}: ChantierCoverImageUploadProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Format invalide",
        description: "Seuls les formats JPG, PNG et WEBP sont acceptés.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 10 Mo.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `cover_${Date.now()}.${fileExt}`;
      const filePath = `${chantierId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("chantiers-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("chantiers-documents")
        .getPublicUrl(filePath);

      // Insert into chantiers_documents table
      const { error: dbError } = await supabase.from("chantiers_documents").insert({
        chantier_id: chantierId,
        nom: `Image de couverture - ${file.name}`,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
      });

      if (dbError) {
        // Rollback storage upload on DB error
        await supabase.storage.from("chantiers-documents").remove([filePath]);
        throw dbError;
      }

      setPreviewUrl(urlData.publicUrl);
      onImageUploaded?.(urlData.publicUrl);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["chantier-detail", chantierId] });
      queryClient.invalidateQueries({ queryKey: ["chantier-documents", chantierId] });

      toast({
        title: "Image téléchargée",
        description: "L'image de couverture a été mise à jour.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de télécharger l'image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      
      <div
        onClick={handleClick}
        className="relative w-full aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer overflow-hidden transition-colors bg-muted/30"
      >
        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt="Image de couverture"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImagePlus className="h-10 w-10" />
            <span className="text-sm">Cliquez pour ajouter une image</span>
          </div>
        )}
        
        {previewUrl && !isUploading && (
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-white text-sm font-medium">Modifier l'image</span>
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Formats acceptés : JPG, PNG, WEBP (max 10 Mo)
      </p>
    </div>
  );
};
