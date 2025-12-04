import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Upload, FileText, Image as ImageIcon, MoreVertical, X, Trash2 } from "lucide-react";
import { useCreateTache } from "@/hooks/useCreateTache";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chantierId: string;
}

interface PendingFile {
  id: string;
  file: File;
  previewUrl?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

const isImageFile = (fileType: string) => fileType.startsWith("image/");

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return <ImageIcon className="h-8 w-8 text-muted-foreground" />;
  }
  if (fileType === "application/pdf") {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  return <FileText className="h-8 w-8 text-muted-foreground" />;
};

const getSmallFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4 text-green-600 flex-shrink-0" />;
  }
  if (fileType === "application/pdf") {
    return <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
};

export const TaskFormDialog = ({ open, onOpenChange, chantierId }: TaskFormDialogProps) => {
  const createTache = useCreateTache();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    date_debut: today,
    date_fin: nextWeek,
    heures_estimees: "",
    montant_vendu: "",
  });

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const newPendingFiles: PendingFile[] = [];
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} dépasse la taille maximale de 10 MB`);
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: type de fichier non supporté`);
        continue;
      }
      
      const pendingFile: PendingFile = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        file,
      };
      
      // Create preview for images
      if (isImageFile(file.type)) {
        pendingFile.previewUrl = URL.createObjectURL(file);
      }
      
      newPendingFiles.push(pendingFile);
    }
    
    setPendingFiles(prev => [...prev, ...newPendingFiles]);
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (id: string) => {
    setPendingFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom.trim()) return;

    try {
      // Create the task first
      const newTache = await createTache.mutateAsync({
        chantier_id: chantierId,
        nom: formData.nom.trim(),
        description: formData.description.trim() || undefined,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        heures_estimees: formData.heures_estimees ? parseInt(formData.heures_estimees) : undefined,
        montant_vendu: formData.montant_vendu ? parseFloat(formData.montant_vendu) : undefined,
      });

      // Upload pending files if any
      if (pendingFiles.length > 0 && newTache?.id) {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: { user } } = await supabase.auth.getUser();
        
        for (const pendingFile of pendingFiles) {
          const fileExt = pendingFile.file.name.split(".").pop();
          const fileName = `${newTache.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          // Upload file to storage
          const { error: uploadError } = await supabase.storage
            .from("taches-documents")
            .upload(fileName, pendingFile.file);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            toast.error(`Erreur lors de l'upload de ${pendingFile.file.name}`);
            continue;
          }

          // Create database entry
          const { error: dbError } = await supabase.from("taches_documents").insert({
            tache_id: newTache.id,
            nom: pendingFile.file.name,
            file_path: fileName,
            file_type: pendingFile.file.type,
            file_size: pendingFile.file.size,
            uploaded_by: user?.id,
          });

          if (dbError) {
            console.error("DB error:", dbError);
          }
        }
        
        if (pendingFiles.length > 0) {
          toast.success(`${pendingFiles.length} fichier(s) ajouté(s)`);
        }
      }

      // Clean up preview URLs
      pendingFiles.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });

      // Reset form and close
      setFormData({
        nom: "",
        description: "",
        date_debut: today,
        date_fin: nextWeek,
        heures_estimees: "",
        montant_vendu: "",
      });
      setPendingFiles([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleClose = () => {
    // Clean up preview URLs
    pendingFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setPendingFiles([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom de la tâche *</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Ex: Fondations"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description optionnelle..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_debut">Date début *</Label>
              <Input
                id="date_debut"
                type="date"
                value={formData.date_debut}
                onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_fin">Date fin *</Label>
              <Input
                id="date_fin"
                type="date"
                value={formData.date_fin}
                onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                min={formData.date_debut}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heures_estimees">Heures estimées</Label>
              <Input
                id="heures_estimees"
                type="number"
                value={formData.heures_estimees}
                onChange={(e) => setFormData({ ...formData, heures_estimees: e.target.value })}
                placeholder="Ex: 40"
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="montant_vendu">Montant vendu (€)</Label>
              <Input
                id="montant_vendu"
                type="number"
                value={formData.montant_vendu}
                onChange={(e) => setFormData({ ...formData, montant_vendu: e.target.value })}
                placeholder="Ex: 5000"
                min={0}
                step="0.01"
              />
            </div>
          </div>

          {/* Documents section */}
          <div className="space-y-3">
            <Label>Documents</Label>
            
            {/* Upload zone */}
            <div
              className="border-2 border-dashed border-border/50 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Cliquez pour ajouter des fichiers
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JPG, PNG (max 10 MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileSelect}
            />

            {/* Pending files grid */}
            {pendingFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {pendingFiles.map((pendingFile) => (
                  <div
                    key={pendingFile.id}
                    className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all relative"
                  >
                    {/* Preview Area */}
                    <div className="h-24 bg-muted/30 flex items-center justify-center overflow-hidden">
                      {pendingFile.previewUrl ? (
                        <img
                          src={pendingFile.previewUrl}
                          alt={pendingFile.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          {getFileIcon(pendingFile.file.type)}
                          <span className="text-xs text-muted-foreground uppercase font-medium">
                            {pendingFile.file.type.split("/")[1]?.toUpperCase() || "FILE"}
                          </span>
                        </div>
                      )}
                      
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removePendingFile(pendingFile.id)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 hover:bg-destructive text-white transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    {/* File Info */}
                    <div className="p-2">
                      <div className="flex items-center gap-1.5">
                        {getSmallFileIcon(pendingFile.file.type)}
                        <p className="text-xs font-medium truncate flex-1" title={pendingFile.file.name}>
                          {pendingFile.file.name}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 pl-5">
                        {(pendingFile.file.size / 1024).toFixed(1)} Ko
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={createTache.isPending}>
              {createTache.isPending ? "Création..." : "Créer la tâche"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
